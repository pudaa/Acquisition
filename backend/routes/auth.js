import express from 'express';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import auth from '../middleware/auth.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = resolve(__dirname, '../../frontend/public/avatars');
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// ------------------------------------------------- 以下为路由函数 -------------------------------------------------

const router = express.Router();

// 登录路由
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ 
        error: '用户不存在',
        code: 401
      });
    }

    const isValid = await User.validatePassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ 
        error: '密码错误',
        code: 401 
      });
    }

    const token = jwt.sign(
        {
            userId: user.id,
            role: user.role,
            realname: user.realname,
            username: user.username,
            class_name: user.class_name
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
    
    res.json({ 
        token,
        user: { 
            id: user.id,
            username: user.username,
            role: user.role,
            realname: user.realname,
            avatar: user.avatar_url,
            class_name: user.class_name
        }
    });
  } catch (error) {
    console.error(error); 
  }
});

// 头像上传接口
router.post('/upload-avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });
  res.json({ url: '/avatars/' + req.file.filename });
});

// 个人信息修改接口（支持头像、昵称、密码）
router.post('/update-profile', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { realname, avatar, newPassword } = req.body;
    // 更新昵称和头像
    await User.updateProfile(userId, { realname, avatar });
    // 如果有新密码，更新密码
    if (newPassword && newPassword.length >= 6) {
      await User.updatePassword(userId, newPassword);
    }
    res.json({ message: '修改成功' });
  } catch (e) {
    res.status(500).json({ error: '修改失败' });
  }
});

// 注册路由
router.post('/register', async (req, res) => {
  try {
    const { username, password, realname  } = req.body;
    
    // 检查学号是否已存在（已优化错误提示）
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ 
        error: '学号已存在',  // 保持与前端匹配的字段名
        code: 400             // 添加标准状态码用户名
      });
    }
    // // 添加姓名格式验证
    // const realnameRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // if (!realnameRegex.test(realname)) {
    //   return res.status(400).json({ 
    //     error: '姓名格式不正确',
    //     code: 400
    //   });
    // }
    // // 检查姓名是否已存在
    // const existingRealname = await User.findByRealname(realname);
    // if (existingRealname) {
    //   return res.status(400).json({ 
    //     error: '姓名已被注册',
    //     code: 400
    //   });
    // }

    const result = await User.register(username, password, realname);
    res.status(201).json({ 
      message: '注册成功',
      code: 201,  // 添加状态码便于前端识别
      user: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      error: error.message || '注册失败', // 传递原始错误信息
      code: 500
    });
  }
});

// 找回密码
router.post('/retrieve-password', async (req, res) => {
  try {
    const { studentId, realname } = req.body;
    
    // 参数验证
    if (!studentId || !realname) {
      return res.status(400).json({ error: '请提供学号和姓名' });
    }

    // 获取密码
    const password = await User.retrievePassword(studentId, realname);
    
    res.json({ 
      success: true,
      password: password,
      error: null 
    });

  } catch (error) {
    console.error('密码找回失败:', error);
    res.status(500).json({ 
      error: error.message.replace('Error: ', '') 
    });
  }
});

export default router;