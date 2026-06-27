import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import experimentRoutes from './routes/experiment.js';
import analysisRouter from './routes/analysis.js'
import teacherRouter from './routes/teacher.js';
import discussionRouter from './routes/discussion.js';
import practice from './routes/practice.js';
import classRouter from './routes/class.js';
import aiRouter from './routes/ai.js';
dotenv.config();

const app = express();

// 中间件
app.use(cors()); // 允许跨域
app.use(express.json({ limit: '50mb' })); // 解析 JSON 请求体
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// 启动服务器
const PORT = process.env.PORT || 5550;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});