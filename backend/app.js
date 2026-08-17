import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
import experimentRoutes from './routes/experiment.js';
import analysisRouter from './routes/analysis.js'
import teacherRouter from './routes/teacher.js';
import discussionRouter from './routes/discussion.js';
import practice from './routes/practice.js';
import classRouter from './routes/class.js';
import aiRouter from './routes/ai.js';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// 中间件
app.use(cors()); // 允许跨域
app.use(compression({ threshold: 1024 })); // gzip 压缩（>1KB 响应）
// 默认 2MB 请求体上限（save-progress 等接口在路由层单独放宽）
app.use(express.json({ limit: '2mb' })); // 解析 JSON 请求体
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// 路由
app.use('/api/auth', authRouter);
app.use('/api/experiments', experimentRoutes);
app.use('/api/analysis', analysisRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/discussion', discussionRouter);
app.use('/api/practice', practice);
app.use('/api/class', classRouter);
app.use('/api/correction-notebook', practice);
app.use('/api/ai', aiRouter);

// ===== 静态托管（单端口对外：后端同时承接页面与 API）=====
const publicDir = path.resolve(__dirname, '../frontend/public'); // 动态上传内容（封面/头像/实验文件等）
const distDir = path.resolve(__dirname, '../frontend/dist');     // 前端构建产物
const hasBuild = fs.existsSync(path.join(distDir, 'index.html'));

// 1. 动态上传内容优先（构建后新上传的文件只存在于 public/，不在 dist/ 中）
//    上传文件名为 UUID/随机，重传不覆盖 → 可安全缓存 1 天
app.use(express.static(publicDir, { maxAge: '1d' }));

if (hasBuild) {
  // 2. 前端构建产物（index.html + static/ 等，Vite 产物带内容哈希 → 可长缓存）
  app.use(express.static(distDir, { maxAge: '7d', immutable: true }));
  // 3. SPA 回退：其余 GET 请求返回 index.html（hash 路由下主要用于根路径）
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distDir, 'index.html'));
    }
    next();
  });
  console.log(`[静态托管] 已启用前端构建产物: ${distDir}`);
} else {
  console.log('[静态托管] 未检测到前端构建产物（frontend/dist），仅提供 API 服务');
}

// 启动服务器
const PORT = process.env.PORT || 5550;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});