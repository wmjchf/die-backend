// ⚠️ 重要：必须在所有其他导入之前加载环境变量
// 导入 env.js 会立即执行 dotenv.config()，确保环境变量在其他模块加载前已设置
import './config/env.js';

import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/index.js';
import { initCronJobs } from './services/cronService.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import contactRoutes from './routes/contact.js';
import checkinRoutes from './routes/checkin.js';
import healthRoutes from './routes/health.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// 健康检查路由（放在最前面，方便监控）
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/checkin', checkinRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 错误处理
app.use(errorHandler);

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await initDatabase();
    logger.info('数据库初始化完成');

    // 启动定时任务
    initCronJobs();
    logger.info('定时任务已启动');

    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();

