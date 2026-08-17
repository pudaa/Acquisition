import express from 'express';
import { db } from '../config/db.js';
import auth, { requireRole } from '../middleware/auth.js';

const router = express.Router();

// 教师专属接口：全部要求教师角色
router.use(auth, requireRole('teacher'));

// 修改获取学生列表的SQL查询
// 修改查询语句添加平均完成率计算
router.get('/students', auth, async (req, res) => {
    try {
        const { search } = req.query;
        let sql = `SELECT 
            u.id AS user_id,
            u.username,
            u.realname,
            u.class_name,
            u.class_id,
            COALESCE(AVG(ue.progress), 0) AS average_progress 
            FROM users u
            LEFT JOIN user_experiments ue ON u.id = ue.user_id
            WHERE u.role = 'student'`;

        const params = [];
        if (search) {
            sql += ` AND (u.username LIKE ? OR u.realname LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        sql += ` GROUP BY u.id`;  // 添加分组

        const results = await db.query(sql, params);
        res.json({ data: results });
    } catch (err) {
        console.error('获取学生列表失败:', err);
        res.status(500).json({ error: '获取学生列表失败' });
    }
});

// 获取学生实验任务
router.get('/students/:userId/experiments', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const sql = `
            SELECT 
                e.exp_id AS id,
                e.title,
                e.difficulty,
                ue.progress,
                ue.last_studied  AS assigned_at
            FROM user_experiments ue
            JOIN experiments e ON ue.exp_id = e.exp_id
            WHERE ue.user_id = ?
            ORDER BY ue.last_studied  DESC`;
        
        const results = await db.query(sql, [userId]);
        res.json({ data: results });
    } catch (err) {
        console.error('获取学生实验失败:', err);
        res.status(500).json({ error: '获取学生实验失败' });
    }
});

// 添加实验任务
router.post('/students/:userId/experiments', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const expId = req.body.expId || req.body.exp_id;

        // 检查是否已存在
        const rows = await db.query(
            'SELECT * FROM user_experiments WHERE user_id = ? AND exp_id = ?',
            [userId, expId]
        );
        if (rows.length > 0) {
            return res.status(400).json({ error: '该实验已分配给该学生' });
        }

        // 插入新任务
        await db.query(
            `INSERT INTO user_experiments 
            (user_id, exp_id, progress, is_completed, last_studied)
            VALUES (?, ?, 0, 0, NOW())`,
            [userId, expId]
        );

        res.json({ message: '添加实验任务成功' });
    } catch (err) {
        console.error('添加任务失败:', err);
        res.status(500).json({ error: '添加实验任务失败' });
    }
});

// 答案归一化工具
function normalizeAnswer(ans) {
  if (ans === null || ans === undefined) return [];
  if (typeof ans === 'string') {
    try {
      const parsed = JSON.parse(ans);
      if (Array.isArray(parsed)) return parsed.map(x => Number(x));
      return [Number(parsed)];
    } catch {
      return [Number(ans)];
    }
  }
  if (typeof ans === 'number') return [ans];
  if (Array.isArray(ans)) return ans.map(x => Number(x));
  return [];
}

// 获取学生在某实验下的练习答题正确率（重新判断答案）
router.get('/students/:user_id/experiments/:exp_id/practice-rate', auth, async (req, res) => {
  const userId = req.params.user_id;
  const expId = req.params.exp_id;
  try {
    // 1. 查最后一次答题记录
    const records = await db.query(
      `SELECT pr.question_id, pr.user_answer, q.correct_answers
       FROM practice_records pr
       JOIN questions q ON pr.question_id = q.id
       INNER JOIN (
         SELECT question_id, MAX(created_at) AS max_time
         FROM practice_records
         WHERE user_id = ? AND exp_id = ?
         GROUP BY question_id
       ) latest
       ON pr.question_id = latest.question_id AND pr.created_at = latest.max_time
       WHERE pr.user_id = ? AND pr.exp_id = ?`,
      [userId, expId, userId, expId]
    );

    let total = records.length;
    let correct = 0;
    for (const rec of records) {
      const ua = normalizeAnswer(rec.user_answer);
      const ca = normalizeAnswer(rec.correct_answers);
      if (JSON.stringify(ua.sort()) === JSON.stringify(ca.sort())) correct++;
    }
    res.json({ code: 0, data: { total, correct } });
  } catch (e) {
    res.status(500).json({ code: 1, error: '查询失败' });
  }
});

// 获取学生所有实验的总答题正确率
router.get('/students/:user_id/practice-rate', auth, async (req, res) => {
  const userId = req.params.user_id;
  try {
    const [result] = await db.query(
      `SELECT 
         COUNT(*) AS total, 
         SUM(is_correct) AS correct
       FROM (
         SELECT pr.*
         FROM practice_records pr
         INNER JOIN (
           SELECT question_id, MAX(created_at) AS max_time
           FROM practice_records
           WHERE user_id = ?
           GROUP BY question_id
         ) latest
         ON pr.question_id = latest.question_id AND pr.created_at = latest.max_time
         WHERE pr.user_id = ?
       ) t`,
      [userId, userId]
    );
    res.json({ code: 0, data: { total: result.total, correct: result.correct || 0 } });
  } catch (e) {
    res.status(500).json({ code: 1, error: '查询失败' });
  }
});

// 按学生聚合各实验答题率（一次查询返回全部，替代前端 N 次请求）
// 与 /practice-rate 单实验接口保持相同语义：取每道题最后一次作答并重新判定
router.get('/students/:user_id/practice-rates', auth, async (req, res) => {
  const userId = req.params.user_id;
  try {
    const records = await db.query(
      `SELECT pr.exp_id, pr.question_id, pr.user_answer, q.correct_answers
       FROM practice_records pr
       JOIN questions q ON pr.question_id = q.id
       INNER JOIN (
         SELECT question_id, MAX(created_at) AS max_time
         FROM practice_records
         WHERE user_id = ?
         GROUP BY question_id
       ) latest
         ON pr.question_id = latest.question_id AND pr.created_at = latest.max_time
       WHERE pr.user_id = ?`,
      [userId, userId]
    );

    const data = {};
    for (const rec of records) {
      const ua = normalizeAnswer(rec.user_answer);
      const ca = normalizeAnswer(rec.correct_answers);
      const isCorrect = JSON.stringify(ua.sort()) === JSON.stringify(ca.sort());
      const entry = data[rec.exp_id] || (data[rec.exp_id] = { total: 0, correct: 0 });
      entry.total++;
      if (isCorrect) entry.correct++;
    }
    res.json({ code: 0, data });
  } catch (e) {
    res.status(500).json({ code: 1, error: '查询失败' });
  }
});

export default router;
