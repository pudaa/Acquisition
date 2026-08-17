import express from 'express';
import { db } from '../config/db.js';
import auth, { requireRole } from '../middleware/auth.js';

const router = express.Router();

// 数据分析接口：仅教师可访问
router.use(auth, requireRole('teacher'));

// 时间范围参数解析：仅接受 1~3650 的整数，其他一律返回 null（防注入）
function parseTimeRange(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0 || n > 3650) return null;
  return n;
}

// 实验完成率分布数据（增加时间过滤）
router.get('/completion', async (req, res) => {
    try {
        const days = parseTimeRange(req.query.time_range);
        const whereClause = days ? `WHERE ue.completion_time >= DATE_SUB(NOW(), INTERVAL ? DAY)` : '';
        const params = days ? [days] : [];

        const sql = `
            SELECT e.exp_id, e.title,
            COUNT(ue.user_id) AS total_users,
            SUM(ue.is_completed) AS completed_users
            FROM experiments e
            LEFT JOIN user_experiments ue ON e.exp_id = ue.exp_id
            ${whereClause}
            GROUP BY e.exp_id
        `;
        const results = await db.query(sql, params);
        res.json({ data: results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '获取完成率数据失败' });
    }
});

// 学习进度趋势数据（动态时间范围）
router.get('/progress-trend', async (req, res) => {
    try {
        const days = parseTimeRange(req.query.time_range) || 30;
        const sql = `
            SELECT DATE(start_time) AS date, AVG(progress) AS avg_progress
            FROM experiment_attempts
            WHERE start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY date ORDER BY date ASC
        `;
        const results = await db.query(sql, [days]);
        res.json({ data: results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '获取进度趋势失败' });
    }
});

// 实验难度分布
router.get('/difficulty', async (req, res) => {
    try {
        const sql = `
            SELECT 
                difficulty AS name, 
                COUNT(*) AS value
            FROM experiments
            GROUP BY difficulty
        `;
        const results = await db.query(sql);
        res.json({ data: results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '获取难度分布失败' });
    }
});

// 学生行为数据获取
// 注意：该接口对 experiment_attempts 做 JSON_TABLE 解析，无索引可用，
// 未指定时间范围时默认限制最近 30 天，避免全表扫描拖垮数据库
router.get('/operations', async (req, res) => {
    try {
        const { time_range, exp_id } = req.query;
        const whereConditions = [];
        const params = [];

        if (exp_id) {
            whereConditions.push('exp_id = ?');
            params.push(exp_id);
        }
        const days = parseTimeRange(time_range) || 30;
        whereConditions.push('start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)');
        params.push(days);

        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : '';
        const sql = `
            SELECT 
                g.title AS operation_type,
                COUNT(*) AS count
            FROM experiment_attempts
            JOIN JSON_TABLE(
                operations,
                '$[*]' COLUMNS (
                    action VARCHAR(50) PATH '$.action'
                )
            ) AS j
            JOIN JSON_TABLE(
                goals,
                '$[*]' COLUMNS (
                    action VARCHAR(50) PATH '$.action',
                    title VARCHAR(100) PATH '$.title'
                )
            ) AS g ON j.action = g.action
            ${whereClause}
            GROUP BY g.title
        `;
        const results = await db.query(sql, params);
        res.json({ data: results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '获取操作数据失败' });
    }
});

export default router;