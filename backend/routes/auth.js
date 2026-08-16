import express from 'express';
import { User } from '../models/User.js';
import { db } from '../config/db.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import auth from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============ 头像上传安全配置 ============
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_EXTS = /\.(png|jpe?g|gif|webp|bmp|ico)$/i;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = resolve(__dirname, '../../frontend/public/avatars');
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // 随机文件名，杜绝路径穿越与重名覆盖
    const ext = path.extname(file.originalname.replace(/[\\/]/g, '/').split('/').pop()).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_AVATAR_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_AVATAR_EXTS.test(file.originalname)) {
      return cb(new Error('头像仅支持图片文件（png/jpg/gif/webp等）'));
    }
    cb(null, true);
  }
});

// 登录/找回密码限流：防止暴力破解与账号枚举爆破
const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'login' });
const retrieveLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5, keyPrefix: 'retrieve' });

// ------------------------------------------------- 以下为路由函数 -------------------------------------------------

const router = express.Router();

// 登录路由
router.post('/login', loginLimiter, async (req, res) => {
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
            class_name: user.class_name,
            class_id: user.class_id ?? null
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
    
    // 查询班级名称（通过 classes 表）
    let className = user.class_name;
    if (user.class_id) {
      const [cls] = await db.query('SELECT name FROM classes WHERE id = ?', [user.class_id]);
      if (cls) className = cls.name;
    }
    
    res.json({ 
        token,
        user: { 
            id: user.id,
            username: user.username,
            role: user.role,
            realname: user.realname,
            avatar: user.avatar_url,
            class_name: className,
            class_id: user.class_id ?? null
        }
    });
  } catch (error) {
    console.error(error); 
  }
});

// 头像上传接口（需登录，仅图片、随机文件名）
router.post('/upload-avatar', auth, (req, res) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? '头像大小超过限制（最大 5MB）'
        : (err.message || '头像上传失败');
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: '未上传文件' });
    res.json({ url: '/avatars/' + req.file.filename });
  });
});

// 个人信息修改接口（支持头像、昵称、密码）
router.post('/update-profile', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { realname, avatar, newPassword } = req.body;
    // 输入校验
    if (realname !== undefined) {
      if (typeof realname !== 'string' || realname.trim().length < 1 || realname.length > 30) {
        return res.status(400).json({ error: '姓名长度需在 1~30 字符之间' });
      }
    }
    if (avatar !== undefined && (typeof avatar !== 'string' || avatar.length > 200)) {
      return res.status(400).json({ error: '头像地址无效' });
    }
    if (newPassword !== undefined && newPassword !== '') {
      if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 72) {
        return res.status(400).json({ error: '密码长度需在 6~72 字符之间' });
      }
    }
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
    
    // 服务端输入校验
    if (!username || !password || !realname) {
      return res.status(400).json({ error: '学号、密码、姓名均不能为空', code: 400 });
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 72) {
      return res.status(400).json({ error: '密码长度需在 6~72 字符之间', code: 400 });
    }
    if (typeof realname !== 'string' || realname.trim().length < 1 || realname.length > 30) {
      return res.status(400).json({ error: '姓名长度需在 1~30 字符之间', code: 400 });
    }
    if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: '学号长度需在 3~30 字符之间', code: 400 });
    }

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
router.post('/retrieve-password', retrieveLimiter, async (req, res) => {
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