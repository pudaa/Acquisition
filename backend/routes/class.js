import express from 'express';
import { User } from '../models/User.js';
import { Class } from '../models/Class.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// 获取教师所在班级的学生列表
router.get('/students', auth, async (req, res) => {
    try {
      const teacher = await User.findByUsername(req.user.username);
      if (teacher.role !== 'teacher') {
        return res.status(403).json({ error: '权限不足' });
      }
      // 教师可能还没有创建班级
      if (!teacher.class_id) {
        return res.json([]);
      }
      const students = await Class.findStudents(teacher.class_id);
      res.json(students);
    } catch (error) {
      console.error('获取学生失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
});

// 获取教师当前班级信息
router.get('/info', auth, async (req, res) => {
  try {
    const teacher = await User.findByUsername(req.user.username);
    if (teacher.role !== 'teacher') {
      return res.status(403).json({ error: '权限不足' });
    }
    if (!teacher.class_id) {
      return res.json({ class: null });
    }
    const cls = await Class.findById(teacher.class_id);
    res.json({ class: cls });
  } catch (error) {
    console.error('获取班级信息失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 添加学生到教师的班级
router.post('/add-student', auth, async (req, res) => {
  try {
    const teacher = await User.findByUsername(req.user.username);
    if (teacher.role !== 'teacher') {
      return res.status(403).json({ error: '权限不足' });
    }
    // 教师还没有班级时自动创建
    if (!teacher.class_id) {
      const classId = await Class.create('我的班级', teacher.id);
      await db_updateTeacherClassId(teacher.id, classId);
      teacher.class_id = classId;
    }

    const { studentId } = req.body;
    const result = await User.updateStudentClass(studentId, teacher.class_id);
    if (result === undefined) {
      return res.status(405).json({ error: '该学生已经分配班级' });
    }else if (result.affectedRows === 0) {
      return res.status(405).json({ error: '未找到该学生' });
    }

    res.json({ message: '添加成功' });
  } catch (error) {
    console.error('添加学生失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 踢出学生
router.delete('/remove-student/:studentId', auth, async (req, res) => {
  try {
    const teacher = await User.findByUsername(req.user.username);
    if (teacher.role !== 'teacher') {
      return res.status(403).json({ error: '权限不足' });
    }
    if (!teacher.class_id) {
      return res.status(404).json({ error: '未找到该学生或不在当前班级' });
    }

    const { studentId } = req.params;
    const result = await User.removeStudentFromClass(studentId, teacher.class_id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '未找到该学生或不在当前班级' });
    }

    res.json({ message: '移除成功' });
  } catch (error) {
    console.error('移除学生失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 修改教师班级名称
router.put('/update-classname', auth, async (req, res) => {
  try {
    const teacher = await User.findByUsername(req.user.username);
    if (teacher.role !== 'teacher') {
      return res.status(403).json({ error: '权限不足' });
    }

    const { newClassName } = req.body;
    if (!newClassName || newClassName.trim() === '') {
      return res.status(400).json({ error: '班级名不能为空' });
    }
    // 教师还没有班级时自动创建
    if (!teacher.class_id) {
      const classId = await Class.create(newClassName.trim(), teacher.id);
      await db_updateTeacherClassId(teacher.id, classId);
    } else {
      await Class.updateName(teacher.class_id, newClassName.trim());
    }

    res.json({ message: '班级名更新成功' });
  } catch (error) {
    console.error('更新班级名失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新教师 users 表中的 class_id
async function db_updateTeacherClassId(userId, classId) {
  const { db } = await import('../config/db.js');
  await db.query('UPDATE users SET class_id = ? WHERE id = ?', [classId, userId]);
}

export default router;