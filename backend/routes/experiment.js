
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import express from 'express';
import { db } from '../config/db.js';
import auth from '../middleware/auth.js';


const coverStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve(__dirname, '../../frontend/public/covers'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: coverStorage });

const router = express.Router();
router.get('/', auth, async (req, res) => {
    try {
        const { page = 1, search = '' } = req.query;
        const userId = req.user.id;
        // 修改分页参数为数字类型
        const pageSize = Number(req.query.pageSize) || 10;
        const offset = Math.max((Number(page) - 1) * pageSize, 0); // 确保非负数
        console.log('查询参数:', pageSize, offset); // 添加日志
        // 修改基础查询语句
        const baseQuery = `
            SELECT 
                e.exp_id AS id,
                e.title,
                e.cover_url AS cover,
                e.duration,
                ue.progress, 
                ue.is_completed
            FROM experiments e
            LEFT JOIN user_experiments ue 
                ON ue.exp_id = e.exp_id
            WHERE ue.user_id LIKE ? 
            ORDER BY e.exp_id
        `;
        
        // 获取分页数据
        // 修改主查询参数结构
        const experiments = await db.query(
            `${baseQuery} LIMIT ? OFFSET ?`,
            [
                userId.toString(), 
                pageSize.toString(),
                offset.toString()
            ]
        );
        console.log('查询结果:', experiments); // 添加日志
        // 修改总数查询参数结构
        const total = experiments.length; 
        const result = {
            data:  experiments,
            pagination: {
                current_page: Number(page),
                total_pages: Math.ceil(total / pageSize) || 1,
                total_items: total
            }
        };
        
        console.log('后端响应数据:', result); // 添加响应日志
        res.json(result);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '数据库查询失败' });
    }
});

// 实验上传接口
router.post('/upload', upload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'htmlFile', maxCount: 1 },
    { name: 'resources', maxCount: 10 }
]), async (req, res) => {
    try {
        // 1. 获取表单字段
        const { title, subject, difficulty, duration, introduce, guidance, steps, element } = req.body;
        const coverFile = req.files['cover']?.[0];
        const htmlFile = req.files['htmlFile']?.[0];
        const resourceFiles = req.files['resources'] || [];

        // 插入数据库，获取exp_id
        const cover_url = coverFile ? '/covers/' + coverFile.filename : '';
        const stepsJson = steps;
        const elementJson = element;

        // 插入实验
        const result = await db.query(
            `INSERT INTO experiments (title, subject, cover_url, duration, steps, introduce, guidance, element)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, subject, cover_url, duration, stepsJson, introduce, guidance, elementJson]
        );
        const exp_id = result.insertId;

        // 存储主文件
        if (htmlFile) {
            const expDir = path.resolve(__dirname, `../../frontend/public/experiments/${exp_id}`);
            if (!fs.existsSync(expDir)) fs.mkdirSync(expDir, { recursive: true });
            fs.copyFileSync(htmlFile.path, path.join(expDir, 'index.html'));
        }

        // 存储资源文件
        if (resourceFiles.length > 0) {
            const resDir = path.resolve(__dirname, `../../frontend/public/experiments_resources/${exp_id}`);
            if (!fs.existsSync(resDir)) fs.mkdirSync(resDir, { recursive: true });
            for (const file of resourceFiles) {
                fs.copyFileSync(file.path, path.join(resDir, file.filename));
            }
        }

        res.json({ expId: exp_id });
    } catch (err) {
        console.error('实验上传失败:', err);
        res.status(500).json({ error: '实验上传失败' });
    }
});

// 获取所有元件列表（id和name）
router.get('/element-list', async (req, res) => {
  try {
    const elements = await db.query('SELECT id, name FROM elements');
    res.json({ data: elements });
  } catch (err) {
    res.status(500).json({ error: '获取元件列表失败' });
  }
});

// 获取元件信息（支持批量ids查询，实验简介组件用）
router.get('/elements', async (req, res) => {
    try {
        let ids = req.query.ids;
        if (!ids) return res.json({ data: [] });
        if (typeof ids === 'string') ids = ids.split(',').map(id => Number(id));
        if (!Array.isArray(ids) || ids.length === 0) return res.json({ data: [] });
        // 查询元件信息
        const sql = `SELECT id, name, introduction FROM elements WHERE id IN (${ids.map(() => '?').join(',')})`;
        const elements = await db.query(sql, ids);
        res.json({ data: elements });
    } catch (err) {
        console.error('获取元件信息失败:', err);
        res.status(500).json({ error: '获取元件信息失败' });
    }
});

// 获取全部实验接口
router.get('/all', auth, async (req, res) => {
    try {
        const query = `
            SELECT 
                e.exp_id AS id,
                e.title,
                e.cover_url AS cover,
                e.duration,
                IFNULL(ue.progress, 0) AS progress,
                CASE 
                    WHEN ue.user_id IS NOT NULL THEN 1 
                    ELSE 0 
                END AS is_added
            FROM experiments e
            LEFT JOIN user_experiments ue 
                ON ue.exp_id = e.exp_id 
                AND ue.user_id = ?
            ORDER BY id DESC
        `;
        
        const results = await db.query(query, [req.user.id]);
        res.json({ data: results });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '获取实验列表失败' });
    }
});

// 添加任务接口
router.post('/user/tasks', auth, async (req, res) => {
    try {
        const { experimentId } = req.body;
        const userId = req.user.id;

        // 检查是否已存在
        const exists = await db.query(
            'SELECT * FROM user_experiments WHERE user_id = ? AND exp_id = ?',
            [userId, experimentId]
        );

        if (exists.length > 0) {
            return res.status(400).json({ 
                error: '该实验已在任务列表中',
                code: 400
            });
        }

        // 插入新任务
        await db.query(
            `INSERT INTO user_experiments 
            (user_id, exp_id, progress, is_completed)
            VALUES (?, ?, 0, false)`,
            [userId, experimentId]
        );

        res.json({ message: '添加任务成功', code: 200 });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '添加任务失败', code: 500 });
    }
});

// 上传学生每次实验操作历史
router.post('/save-progress', auth, async (req, res) => {
    try {
        const { expId, progress, operations, goals } = req.body;
        const userId = req.user.id;
        const isCompleted = progress >= 100;

        // 插入新实践记录
        await db.query(
            `INSERT INTO experiment_attempts 
            (user_id, exp_id, progress, is_completed, operations, goals, end_time)
            VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [userId, expId, progress, isCompleted ? 1 : 0, JSON.stringify(operations), JSON.stringify(goals)]
        );

        // 更新user_experiments表（只保留最高进度和完成状态）
        const [userExp] = await db.query(
            'SELECT * FROM user_experiments WHERE user_id = ? AND exp_id = ?',
            [userId, expId]
        );
        if (!userExp) {
            await db.query(
                `INSERT INTO user_experiments (user_id, exp_id, progress, is_completed, last_studied)
                VALUES (?, ?, ?, ?, NOW())`,
                [userId, expId, progress, isCompleted ? 1 : 0]
            );
        } else {
            let updateFields = [];
            let updateValues = [];
            if (progress > userExp.progress) {
                updateFields.push('progress = ?');
                updateValues.push(progress);
            }
            if (isCompleted && !userExp.is_completed) {
                updateFields.push('is_completed = 1');
            }
            if (updateFields.length > 0) {
                updateFields.push('last_studied = NOW()');
                await db.query(
                    `UPDATE user_experiments SET ${updateFields.join(', ')} WHERE user_id = ? AND exp_id = ?`,
                    [...updateValues, userId, expId]
                );
            }
        }
        res.json({ message: '实验实践记录保存成功' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '保存实验实践记录失败' });
    }
});

// 获取实验步骤（steps）
router.get('/:expId/steps', auth, async (req, res) => {
    try {
        const { expId } = req.params;
        const [experiment] = await db.query(
            'SELECT steps FROM experiments WHERE exp_id = ?',
            [expId]
        );
        if (!experiment) {
            return res.status(404).json({ error: '实验不存在' });
        }
        let steps = experiment.steps;
        if (typeof steps === 'string') {
            try {
                steps = JSON.parse(steps);
            } catch (err) {
                console.error('解析steps字段失败:', err);
                return res.status(500).json({ error: '实验步骤格式错误' });
            }
        }

        res.json({ steps });
    } catch (err) {
        console.error('获取实验步骤失败:', err);
        res.status(500).json({ error: '获取实验步骤失败' });
    }
});

// 获取实验标题
router.get('/:expId/title', auth, async (req, res) => {
    try {
        const { expId } = req.params;
        const [experiment] = await db.query(
            'SELECT title FROM experiments WHERE exp_id = ?',
            [expId]
        );
        if (!experiment) {
            return res.status(404).json({ error: '实验不存在' });
        }
        res.json({ title: experiment.title });
    } catch (err) {
        console.error('获取实验标题失败:', err);
        res.status(500).json({ error: '获取实验标题失败' }); 
    }
})

// 获取单个实验详细信息（实验简介组件用）
router.get('/:expId/info', async (req, res) => {
    try {
        const { expId } = req.params;
        const [experiment] = await db.query(
            `SELECT 
                exp_id AS id,
                title,
                steps,
                element,
                guidance,
                prepare,
                introduce
            FROM experiments WHERE exp_id = ?`,
            [expId]
        );
        if (!experiment) {
            return res.status(404).json({ error: '实验不存在' });
        }
        // steps/element 字段可能为字符串，需解析
        let steps = experiment.steps;
        if (typeof steps === 'string') {
            try { steps = JSON.parse(steps); } catch { steps = []; }
        }
        if (steps && steps.steps) steps = steps.steps; // 关键修正
        let element = experiment.element;
        if (typeof element === 'string') {
            try { element = JSON.parse(element); } catch { element = []; }
        }
        res.json({
            data: {
                ...experiment,
                steps,
                element
            }
        });
    } catch (err) {
        console.error('获取实验信息失败:', err);
        res.status(500).json({ error: '获取实验信息失败' });
    }
});

// 获取单个实验学生进度数据
router.get('/:id/students', async (req, res) => {
    try {
        const expId = req.params.id;
        const timeRange = req.query.timeRange || 'all';
        
        // 构建时间过滤条件
        let timeCondition = '';
        if (timeRange !== 'all') {
            const days = parseInt(timeRange);
            timeCondition = `AND ue.last_studied >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`;
        }

        const sql = `
            SELECT 
                u.id as id,
                u.realname as realname,
                u.username as name,
                MAX(ue.progress) as progress
            FROM user_experiments ue
            JOIN users u ON ue.user_id = u.id
            WHERE ue.exp_id = ?
            ${timeCondition}
            GROUP BY u.id
            ORDER BY progress DESC
        `;

        const results = await db.query(sql, [expId]);
        res.json({ data: results });
    } catch (error) {
        console.error('获取学生进度失败:', error);
        res.status(500).json({ error: '获取学生数据失败' });
    }
});


export default router;
