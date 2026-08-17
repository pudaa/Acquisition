import express from 'express';
import { calculateProbabilities, selectDifficulty, updateMasteryScore } from '../utils/practiceAlgorithm.js';
import { db } from '../config/db.js';
import auth from '../middleware/auth.js';
import { aiClient } from '../utils/ai/client.js';

const router = express.Router();

// 生成 IN 子句占位符（execute 预编译下数组不能直接绑定，需展开为多个 ?）
function buildNotIn(answeredQuestions) {
  const ids = Array.isArray(answeredQuestions)
    ? answeredQuestions.map(Number).filter(n => Number.isInteger(n) && n > 0)
    : [];
  const arr = ids.length ? [...new Set(ids)] : [0];
  return {
    placeholders: arr.map(() => '?').join(', '),
    params: arr,
  };
}

// 获取下一题
router.post('/next-question', auth, async (req, res) => {
    try {
        const { expId, masteryScore, answeredQuestions = [] } = req.body;
        const notIn = buildNotIn(answeredQuestions);
        
        // 计算各难度概率
        const probs = calculateProbabilities(masteryScore);
        const difficulty = selectDifficulty(probs);
        
        // 随机取一条未答题目（COUNT + 随机 OFFSET，避免 ORDER BY RAND() 全表排序）
        async function pickRandom(whereSql, params) {
            const [countRow] = await db.query(
                `SELECT COUNT(*) AS cnt FROM questions WHERE ${whereSql}`,
                params
            );
            if (!countRow || countRow.cnt === 0) return null;
            const offset = Math.floor(Math.random() * countRow.cnt);
            const [q] = await db.query(
                `SELECT * FROM questions WHERE ${whereSql} LIMIT 1 OFFSET ?`,
                [...params, offset]
            );
            return q || null;
        }

        // 尝试获取指定难度的题目
        let question = await pickRandom(
            `exp_id = ? AND difficulty = ? AND id NOT IN (${notIn.placeholders})`,
            [expId, difficulty, ...notIn.params]
        );

        // 如果当前难度没有可用题目，随机获取其他难度的题目
        if (!question) {
            question = await pickRandom(
                `exp_id = ? AND id NOT IN (${notIn.placeholders})`,
                [expId, ...notIn.params]
            );
            if (!question) {
                return res.status(404).json({ error: '没有更多可用的题目' });
            }
            res.json({ question });
            return;
        }

        res.json({ question });
    } catch (err) {
        console.error('获取题目失败:', err);
        res.status(500).json({ error: '获取题目失败' });
    }
});

// 添加一个 flag 用于控制是否调用错题解析 API
const ENABLE_ANALYSIS_GENERATION = false; // 默认关闭

// 调用 AI 生成错题解析
async function generateQuestionAnalysis(question, userAnswer, correctAnswer) {
    if (!ENABLE_ANALYSIS_GENERATION) {
        return null;
    }

    if (!process.env.DEEPSEEK_API_KEY) {
        return null;
    }

    try {
        const prompt = `
请为以下错题生成解析：
题目：${question.title}
选项：${JSON.stringify(question.options)}
学生答案：${JSON.stringify(userAnswer)}
正确答案：${JSON.stringify(correctAnswer)}
知识点：${question.knowledge_point || '无'}

请按照以下要求生成解析：
1. 讲解正确答案的解题思路
2. 分析学生错误答案的原因
3. 提供相关的知识点说明
4. 语言简洁明了，适合学生学习

解析内容：`;

        const completion = await aiClient.chat.completions.create({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1024,
        });
        return completion.choices[0]?.message?.content || '解析生成失败';
    } catch (error) {
        console.error('生成错题解析失败:', error);
        return null;
    }
}

// 修改提交答案的逻辑，生成错题解析
router.post('/submit-answer', auth, async (req, res) => {
    try {
        const { questionId, answer, masteryScore: currentMasteryScore } = req.body;
        const userId = req.user.id;

        // 获取题目信息
        const [question] = await db.query('SELECT * FROM questions WHERE id = ?', [questionId]);

        // 归一化
        const userAnswer = normalizeAnswer(answer);
        const correctAnswer = normalizeAnswer(question.correct_answers);

        // 比较
        const isCorrect = JSON.stringify(userAnswer.sort()) === JSON.stringify(correctAnswer.sort());

        // 更新掌握度
        const newMasteryScore = updateMasteryScore(
            parseFloat(currentMasteryScore), 
            question.weight, 
            isCorrect
        );

        // 记录答题记录
        const result = await db.query(
            'INSERT INTO practice_records (user_id, exp_id, question_id, user_answer, is_correct, difficulty, score) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                userId, 
                question.exp_id, 
                questionId, 
                JSON.stringify(userAnswer), 
                isCorrect, 
                question.difficulty, 
                isCorrect ? question.weight : 0
            ]
        );

        // 如果是错题且 analysis 为 null，生成解析
        if (!isCorrect) {
            generateQuestionAnalysis(question, userAnswer, correctAnswer)
                .then(async (analysis) => {
                    if (analysis) {
                        await db.query(
                            'UPDATE practice_records SET analysis = ? WHERE id = ?',
                            [analysis, result.insertId] 
                        );
                    }
                })
                .catch(err => {
                    console.error('生成解析失败:', err);
                });
        }

        res.json({
            isCorrect,
            score: isCorrect ? question.weight : 0,
            newMasteryScore
        });
    } catch (err) {
        console.error('提交答案失败:', err);
        res.status(500).json({ error: '提交答案失败' });
    }
});

// 完成练习
router.post('/complete', auth, async (req, res) => {
    try {
        const { expId, totalScore, masteryScore } = req.body;
        const userId = req.user.id;

        // 记录练习会话
        await db.query(
            `INSERT INTO practice_sessions 
            (user_id, exp_id, total_score, mastery_score) 
            VALUES (?, ?, ?, ?)`,
            [userId, expId, totalScore, masteryScore]
        );

        res.json({ 
            message: '练习完成',
            totalScore,
            masteryScore
        });
    } catch (err) {
        console.error('保存练习结果失败:', err);
        res.status(500).json({ error: '保存练习结果失败' });
    }
});

// 获取当前用户所有错题并按实验分组
router.get('/correction-notebook/all', auth, async (req, res) => {
  console.log('收到错题本请求');
  try {
        const userId = req.user.id;
        // 查询所有做错的题目，按实验分组
        const rows = await db.query(`
            SELECT 
                pr.id AS record_id,
                pr.exp_id,
                e.title AS experiment_title,
                q.id AS question_id,
                q.title AS question_title,
                q.options,
                pr.user_answer,
                q.correct_answers,
                pr.analysis,
                pr.created_at
            FROM practice_records pr
            JOIN questions q ON pr.question_id = q.id
            JOIN experiments e ON pr.exp_id = e.exp_id
            WHERE pr.user_id = ? AND pr.is_correct = 0
            ORDER BY pr.exp_id, pr.created_at DESC
        `, [userId]);
        console.log('错题本查询结果:', rows);
        // 按实验分组
        const grouped = {};
        for (const row of rows) {
            if (!grouped[row.exp_id]) {
                grouped[row.exp_id] = {
                    exp_id: row.exp_id,
                    experiment_title: row.experiment_title,
                    questions: []
                };
            }
                grouped[row.exp_id].questions.push({
                    id: row.question_id,
                    record_id: row.record_id,
                    title: row.question_title,
                    options: row.options,
                    user_answer: row.user_answer,
                    correct_answers: row.correct_answers,
                    analysis: row.analysis,
                    created_at: row.created_at
                });
        }
        res.json({ data: Object.values(grouped) });
    } catch (err) {
        console.error('获取错题本失败:', err);
        res.status(500).json({ error: '获取错题本失败' });
    }
});

// 新增：获取单题解析（如果没有则异步生成）
router.get('/correction-notebook/analysis/:recordId', auth, async (req, res) => {
    const recordId = req.params.recordId;
    try {
        // 查找记录
        const [record] = await db.query('SELECT * FROM practice_records WHERE id = ?', [recordId]);
        if (!record) {
            return res.status(404).json({ error: '题目记录不存在' });
        }
        // 归属校验：只能查看自己的错题解析（防越权）
        if (record.user_id !== req.user.id) {
            return res.status(403).json({ error: '无权访问该记录' });
        }
        // 如果已有解析，直接返回
        if (record.analysis) {
            return res.json({ analysis: record.analysis });
        }
        // 没有解析，异步生成
        res.json({ analysis: null, message: '解析正在生成中' });
        // 获取题目信息
        const [question] = await db.query('SELECT * FROM questions WHERE id = ?', [record.question_id]);
        if (!question) return;
        // 归一化
        const userAnswer = normalizeAnswer(record.user_answer);
        const correctAnswer = normalizeAnswer(question.correct_answers);
        // 生成解析
        generateQuestionAnalysis(question, userAnswer, correctAnswer)
            .then(async (analysis) => {
                if (analysis) {
                    await db.query('UPDATE practice_records SET analysis = ? WHERE id = ?', [analysis, recordId]);
                }
            })
            .catch(err => {
                console.error('异步生成解析失败:', err);
            });
    } catch (err) {
        console.error('获取解析失败:', err);
        res.status(500).json({ error: '获取解析失败' });
    }
});

// 答案归一化工具，兼容数字、字符串、数组、字符串数组
function normalizeAnswer(ans) {
  if (ans === null || ans === undefined) return [];
  if (typeof ans === 'string') {
    try {
      const parsed = JSON.parse(ans);
      if (Array.isArray(parsed)) return parsed.map(x => Number(x));
      return [Number(parsed)];
    } catch {
      // 可能是 "0" 这种
      return [Number(ans)];
    }
  }
  if (typeof ans === 'number') return [ans];
  if (Array.isArray(ans)) return ans.map(x => Number(x));
  return [];
}

export default router;