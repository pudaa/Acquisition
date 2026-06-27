import express from 'express';
import { User } from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// 获取教师所在班级的学生列表
router.get('/students', auth, async (req, res) => {
    console.error('获取学生列表请求:', req.user);
    try {
      const teacher = await User.findByUsername(req.user.username);
      if (teacher.role !== 'teacher') {
        return res.status(403).json({ error: '权限不足' });
      }
  
      const students = await User.findByClass(teacher.class_name);
      res.json(students);
    } catch (error) {
      console.error('获取学生失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
});

// 添加学生到教师的班级
router.post('/add-student', auth, async (req, res) => {
  try {
    const teacher = req.user;
    if (teacher.role !== 'teacher') {
      return res.status(403).json({ error: '权限不足' });
    }

    const { studentId } = req.body;
    const result = await User.updateStudentClass(studentId, teacher.class_name);
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
    const teacher = req.user;
    if (teacher.role !== 'teacher') {
      return res.status(403).json({ error: '权限不足' });
    }

    const { studentId } = req.params;
    const result = await User.removeStudentFromClass(studentId, teacher.class_name);
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
    // 原始班级名
    const oldClassName = teacher.class_name;
    User.updateTeacherClass(teacher.id, newClassName);
    User.updateStudentClassByOldClass(oldClassName, newClassName);

    res.json({ message: '班级名更新成功' });
  } catch (error) {
    console.error('更新班级名失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;