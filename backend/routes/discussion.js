import express from 'express';
import { db } from '../config/db.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// 获取所有话题及其回复
router.get('/topics', auth, async (req, res) => {
  try {
    // 获取所有话题，按置顶和时间排序
    const topics = await db.query(
      `SELECT t.*, u.realname AS authorName FROM discussion_topics t
       JOIN users u ON t.author_id = u.id
       ORDER BY t.is_pinned DESC, t.created_at DESC`
    );
    // 获取所有回复
    const replies = await db.query(
      `SELECT r.*, u.realname AS authorName FROM discussion_replies r
       JOIN users u ON r.author_id = u.id`
    );
    // 组装数据
    const topicMap = {};
    topics.forEach(t => {
      t.replies = [];
      topicMap[t.id] = t;
    });
    replies.forEach(r => {
      if (topicMap[r.topic_id]) {
        topicMap[r.topic_id].replies.push(r);
      }
    });
    res.json({ data: Object.values(topicMap) });
  } catch (err) {
    res.status(500).json({ error: '获取话题失败' });
  }
});

// 新建话题
router.post('/topics', auth, async (req, res) => {
  try {
    const { title, content, authorId, class_id } = req.body;
    if (!title || !content) return res.status(400).json({ error: '标题和内容不能为空' });
    await db.query(
      'INSERT INTO discussion_topics (title, content, author_id, class_id) VALUES (?, ?, ?, ?)',
      [title, content, authorId, class_id ?? null]
    );
    res.json({ message: '发布成功' });
  } catch (err) {
    res.status(500).json({ error: '发布失败' });
  }
});

// 回复话题
router.post('/topics/:topicId/replies', auth, async (req, res) => {
  try {
    const { topicId } = req.params;
    const { content, authorId } = req.body;
    if (!content) return res.status(400).json({ error: '回复内容不能为空' });
    await db.query(
      'INSERT INTO discussion_replies (topic_id, content, author_id) VALUES (?, ?, ?)',
      [topicId, content, authorId]
    );
    res.json({ message: '回复成功' });
  } catch (err) {
    res.status(500).json({ error: '回复失败' });
  }
});

// 删除话题（教师或本人）
router.delete('/topics/:topicId', auth, async (req, res) => {
  try {
    const { topicId } = req.params;
    const user = req.user;
    // 检查权限
    const rows = await db.query('SELECT * FROM discussion_topics WHERE id = ?', [topicId]);
    if (!rows.length) return res.status(404).json({ error: '话题不存在' });
    if (user.role !== 'teacher' && rows[0].author_id !== user.id) {
      return res.status(403).json({ error: '无权限删除' });
    }
    await db.query('DELETE FROM discussion_topics WHERE id = ?', [topicId]);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除失败' });
  }
});

// 删除回复（教师或本人）
router.delete('/topics/:topicId/replies/:replyId', auth, async (req, res) => {
  try {
    const { replyId } = req.params;
    const user = req.user;
    const rows = await db.query('SELECT * FROM discussion_replies WHERE id = ?', [replyId]);
    if (!rows.length) return res.status(404).json({ error: '回复不存在' });
    if (user.role !== 'teacher' && rows[0].author_id !== user.id) {
      return res.status(403).json({ error: '无权限删除' });
    }
    await db.query('DELETE FROM discussion_replies WHERE id = ?', [replyId]);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除失败' });
  }
});

// 置顶话题（仅教师）
router.post('/topics/:topicId/pin', auth, async (req, res) => {
  try {
    const { topicId } = req.params;
    const user = req.user;
    if (user.role !== 'teacher') return res.status(403).json({ error: '仅教师可置顶' });
    await db.query('UPDATE discussion_topics SET is_pinned = 1 WHERE id = ?', [topicId]);
    res.json({ message: '置顶成功' });
  } catch (err) {
    res.status(500).json({ error: '置顶失败' });
  }
});

// 取消置顶话题（仅教师）
router.post('/topics/:topicId/unpin', auth, async (req, res) => {
  try {
    const { topicId } = req.params;
    const user = req.user;
    if (user.role !== 'teacher') return res.status(403).json({ error: '仅教师可操作' });
    await db.query('UPDATE discussion_topics SET is_pinned = 0 WHERE id = ?', [topicId]);
    res.json({ message: '取消置顶成功' });
  } catch (err) {
    res.status(500).json({ error: '取消置顶失败' });
  }
});

export default router;
