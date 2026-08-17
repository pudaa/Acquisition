
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import express from 'express';
import { fileURLToPath } from 'url';
import { db } from '../config/db.js';
import auth, { requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============ 上传安全配置 ============
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 单文件最大 20MB
const ALLOWED_IMAGE_EXTS = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;
const ALLOWED_HTML_EXTS = /\.(html?|htm)$/i;
const ALLOWED_RESOURCE_EXTS = /\.(html?|css|js|mjs|json|png|jpe?g|gif|svg|webp|ico|bmp|txt|md|mp3|wav|ogg|woff2?|ttf|eot|map)$/i;

// 去除路径分隔符与危险字符，仅保留安全的文件名（防路径穿越）
function safeBasename(originalname) {
  const base = String(originalname || '').replace(/[\\/]/g, '/').split('/').pop() || 'file';
  const cleaned = base.replace(/[^a-zA-Z0-9._\-]/g, '_');
  return cleaned || 'file';
}

function randomNameWithExt(originalname) {
  const ext = path.extname(safeBasename(originalname)).toLowerCase();
  return crypto.randomUUID() + ext;
}

const coverStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve(__dirname, '../../frontend/public/covers'));
    },
    filename: function (req, file, cb) {
        cb(null, randomNameWithExt(file.originalname));
    }
});
const upload = multer({
    storage: coverStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'cover') {
            if (!ALLOWED_IMAGE_EXTS.test(file.originalname)) {
                return cb(new Error('封面仅支持图片文件（png/jpg/gif/webp/svg等）'));
            }
        } else if (file.fieldname === 'htmlFile') {
            if (!ALLOWED_HTML_EXTS.test(file.originalname)) {
                return cb(new Error('实验主文件仅支持 HTML 文件'));
            }
        } else if (file.fieldname === 'resources') {
            if (!ALLOWED_RESOURCE_EXTS.test(file.originalname)) {
                return cb(new Error(`资源文件类型不支持：${safeBasename(file.originalname)}`));
            }
            // 资源文件保留原文件名（HTML 内引用依赖它），但经过安全清洗
            file.safeName = safeBasename(file.originalname);
        }
        cb(null, true);
    }
});
const uploadExperimentFiles = upload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'htmlFile', maxCount: 1 },
    { name: 'resources', maxCount: 10 }
]);

const router = express.Router();
router.get('/', auth, async (req, res) => {
    try {
        const { page = 1, search = '' } = req.query;
        const userId = req.user.id;
        // 分页参数：限制 pageSize 1~100
        const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 10, 1), 100);
        const offset = Math.max((Number(page) - 1) * pageSize, 0); // 确保非负数
        // 基础查询语句
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
                ON ue.exp_id = e.exp_id AND ue.user_id = ?
            ORDER BY e.exp_id
        `;

        // 获取分页数据
        const experiments = await db.query(
            `${baseQuery} LIMIT ? OFFSET ?`,
            [
                userId,
                pageSize,
                offset
            ]
        );
        // 总数查询（独立 COUNT，修正原分页总数错误）
        const [countRow] = await db.query(
            `SELECT COUNT(*) AS total
             FROM experiments e
             LEFT JOIN user_experiments ue 
                 ON ue.exp_id = e.exp_id AND ue.user_id = ?
             WHERE ue.user_id = ?`,
            [userId, userId]
        );
        const total = countRow?.total || 0;
        const result = {
            data:  experiments,
            pagination: {
                current_page: Number(page),
                total_pages: Math.ceil(total / pageSize) || 1,
                total_items: total
            }
        };

        res.json(result);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '数据库查询失败' });
    }
});

// 实验上传接口（仅教师）
router.post('/upload', auth, requireRole('teacher'), (req, res, next) => {
    uploadExperimentFiles(req, res, (err) => {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? '文件大小超过限制（单文件最大 20MB）'
                : (err.message || '文件上传失败');
            return res.status(400).json({ error: message });
        }
        next();
    });
}, async (req, res) => {
    try {
        // 1. 获取表单字段
        const { title, subject, difficulty, duration, introduce, guidance, steps, element } = req.body;
        const coverFile = req.files['cover']?.[0];
        const htmlFile = req.files['htmlFile']?.[0];
        const resourceFiles = req.files['resources'] || [];

        // 必填字段校验
        if (!title || !title.trim()) {
            return res.status(400).json({ error: '实验标题不能为空' });
        }
        if (!htmlFile) {
            return res.status(400).json({ error: '实验主文件（index.html）为必填项' });
        }

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

        // 存储资源文件（保留清洗后的原文件名，供 HTML 相对引用）
        if (resourceFiles.length > 0) {
            const resDir = path.resolve(__dirname, `../../frontend/public/experiments_resources/${exp_id}`);
            if (!fs.existsSync(resDir)) fs.mkdirSync(resDir, { recursive: true });
            for (const file of resourceFiles) {
                fs.copyFileSync(file.path, path.join(resDir, file.safeName || safeBasename(file.originalname)));
            }
        }

        res.json({ expId: exp_id });
    } catch (err) {
        console.error('实验上传失败:', err);
        res.status(500).json({ error: '实验上传失败' });
    }
});

// 获取所有元件列表（id和name）
router.get('/element-list', auth, async (req, res) => {
  try {
    const elements = await db.query('SELECT id, name FROM elements');
    res.json({ data: elements });
  } catch (err) {
    res.status(500).json({ error: '获取元件列表失败' });
  }
});

// 获取元件信息（支持批量ids查询，实验简介组件用）
router.get('/elements', auth, async (req, res) => {
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

// 获取全部实验接口（支持分页，防止全量返回）
router.get('/all', auth, async (req, res) => {
    try {
        const page = Math.max(Number(req.query.page) || 1, 1);
        const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 200, 1), 500);
        const offset = (page - 1) * pageSize;
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
            LIMIT ? OFFSET ?
        `;
        
        const results = await db.query(query, [req.user.id, pageSize, offset]);
        const [countRow] = await db.query('SELECT COUNT(*) AS total FROM experiments');
        res.json({
            data: results,
            pagination: {
                current_page: page,
                total_pages: Math.ceil((countRow?.total || 0) / pageSize) || 1,
                total_items: countRow?.total || 0
            }
        });

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
        const { expId, progress, operations, goals, circuit_components } = req.body;
        const userId = req.user.id;
        const isCompleted = progress >= 100;

        // 将电路数据嵌入 goals JSON 中，避免改表结构
        const goalsWithCircuit = { goals, circuit_components };

        // 更新或插入 experiment_attempts
        const [lastAttempt] = await db.query(
            'SELECT attempt_id FROM experiment_attempts WHERE user_id = ? AND exp_id = ? ORDER BY attempt_id DESC LIMIT 1',
            [userId, expId]
        );
        if (lastAttempt) {
            await db.query(
                `UPDATE experiment_attempts SET progress = ?, is_completed = ?, operations = ?, goals = ?, end_time = NOW() WHERE attempt_id = ?`,
                [progress, isCompleted ? 1 : 0, JSON.stringify(operations), JSON.stringify(goalsWithCircuit), lastAttempt.attempt_id]
            );
        } else {
            await db.query(
                `INSERT INTO experiment_attempts (user_id, exp_id, progress, is_completed, operations, goals, end_time)
                VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                [userId, expId, progress, isCompleted ? 1 : 0, JSON.stringify(operations), JSON.stringify(goalsWithCircuit)]
            );
        }

        // 更新 user_experiments（利用 (user_id, exp_id) 唯一键 upsert，只保留最高进度和完成状态）
        await db.query(
            `INSERT INTO user_experiments (user_id, exp_id, progress, is_completed, last_studied)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
                progress = GREATEST(user_experiments.progress, VALUES(progress)),
                is_completed = GREATEST(user_experiments.is_completed, VALUES(is_completed)),
                last_studied = NOW()`,
            [userId, expId, progress, isCompleted ? 1 : 0]
        );
        res.json({ message: '实验实践记录保存成功' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '保存实验实践记录失败' });
    }
});

// 获取用户保存的电路状态（用于意外离开后恢复）
router.get('/:expId/saved-circuit', auth, async (req, res) => {
    try {
        const { expId } = req.params;
        const userId = req.user.id;
        const [attempt] = await db.query(
            'SELECT goals FROM experiment_attempts WHERE user_id = ? AND exp_id = ? ORDER BY attempt_id DESC LIMIT 1',
            [userId, expId]
        );
        if (!attempt) return res.json({ circuit_components: null });

        let goals = attempt.goals;
        if (typeof goals === 'string') goals = JSON.parse(goals);
        const circuit_components = goals?.circuit_components || null;

        res.json({ circuit_components });
    } catch (err) {
        console.error('获取保存的电路失败:', err);
        res.status(500).json({ error: '获取保存的电路失败' });
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
router.get('/:expId/info', auth, async (req, res) => {
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

// 获取单个实验学生进度数据（仅教师）
router.get('/:id/students', auth, requireRole('teacher'), async (req, res) => {
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

// 获取实验引擎配置（支持从 experiment_configs 表读取，无配置时返回传统模式）
router.get('/:expId/config', auth, async (req, res) => {
    try {
        const { expId } = req.params;

        // 先查 experiment_configs 表
        const [configRow] = await db.query(
            'SELECT config FROM experiment_configs WHERE exp_id = ?',
            [expId]
        );

        if (configRow) {
            let config = configRow.config;
            if (typeof config === 'string') config = JSON.parse(config);

            // 自动同步：确保 experiments.steps 和 element 与 engine config 一致
            if (config.goals) {
                const steps = {
                    steps: config.goals.map((g, i) => ({
                        id: (g.id || '').toLowerCase().replace(/_/g, '-').replace(/^goal-/, '') || `step_${i + 1}`,
                        title: g.title,
                        action: g.id,
                        weight: g.weight || 1,
                        done: false,
                    })),
                };
                // element ID 映射
                const typeToId = {
                    wire: 1, switch: 2, bulb: 3, resistor: 4, capacitor: 5,
                    diode: 6, 'transistor-npn': 7, 'transistor-pnp': 8,
                    battery: 9, ground: 10, 'and-gate': 11, 'or-gate': 12,
                    'not-gate': 13, 'nand-gate': 14, 'nor-gate': 15,
                };
                const element = (config.availableComponents || [])
                    .map(type => typeToId[type])
                    .filter(id => id != null);

                // 静默同步（先对比，仅当不同时才写入，避免读接口产生写库开销）
                const stepsJson = JSON.stringify(steps);
                const elementJson = JSON.stringify(element);
                try {
                    const [current] = await db.query(
                        'SELECT steps, element FROM experiments WHERE exp_id = ?',
                        [expId]
                    );
                    if (current && (current.steps !== stepsJson || current.element !== elementJson)) {
                        await db.query(
                            'UPDATE experiments SET steps = ?, element = ? WHERE exp_id = ?',
                            [stepsJson, elementJson, expId]
                        );
                    }
                } catch (syncErr) {
                    // 同步失败不影响主流程
                    console.warn(`  [config] 同步 steps/element 失败: ${syncErr.message}`);
                }
            }

            return res.json({ data: { engineMode: true, config } });
        }

        // 无引擎配置 → 返回传统模式信息
        const [experiment] = await db.query(
            'SELECT exp_id AS id, title, steps, element FROM experiments WHERE exp_id = ?',
            [expId]
        );

        if (!experiment) {
            return res.status(404).json({ error: '实验不存在' });
        }

        let steps = experiment.steps;
        if (typeof steps === 'string') {
            try { steps = JSON.parse(steps); } catch { steps = { steps: [] }; }
        }

        res.json({
            data: {
                engineMode: false,
                experiment: {
                    id: experiment.id,
                    title: experiment.title,
                    steps: steps.steps || [],
                    element: experiment.element,
                },
            },
        });
    } catch (err) {
        console.error('获取实验配置失败:', err);
        res.status(500).json({ error: '获取实验配置失败' });
    }
});

export default router;
