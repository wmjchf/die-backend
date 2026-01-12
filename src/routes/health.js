import express from 'express';
import { getPool } from '../db/index.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * 健康检查接口
 * GET /api/health
 * 
 * 返回服务健康状态，包括：
 * - 服务状态
 * - 数据库连接状态
 * - 系统信息
 */
router.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: {
      name: 'Alive Ping API',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    },
    database: {
      status: 'unknown',
      message: ''
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    }
  };

  // 检查数据库连接
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT 1 as ping');
    
    if (rows && rows.length > 0) {
      health.database.status = 'connected';
      health.database.message = '数据库连接正常';
    } else {
      health.database.status = 'error';
      health.database.message = '数据库查询失败';
      health.status = 'degraded';
    }
  } catch (error) {
    health.database.status = 'error';
    health.database.message = error.message || '数据库连接失败';
    health.status = 'error';
    logger.error('健康检查 - 数据库连接失败:', error);
  }

  // 根据状态返回相应的 HTTP 状态码
  const statusCode = health.status === 'ok' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(health);
});

/**
 * 简单健康检查（仅返回状态）
 * GET /api/health/simple
 */
router.get('/simple', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/**
 * 详细健康检查（包含所有信息）
 * GET /api/health/detailed
 */
router.get('/detailed', async (req, res) => {
  const detailed = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: {
      name: 'Alive Ping API',
      version: '1.0.0',
      uptime: process.uptime(),
      uptimeFormatted: formatUptime(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid
    },
    database: {
      status: 'unknown',
      message: '',
      config: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '3306',
        database: process.env.DB_NAME || 'dieapp',
        user: process.env.DB_USER || 'root'
      }
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuUsage: process.cpuUsage(),
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        unit: 'MB'
      }
    },
    environment: {
      port: process.env.PORT || 3000,
      nodeEnv: process.env.NODE_ENV || 'development',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  };

  // 检查数据库连接
  try {
    const pool = getPool();
    const startTime = Date.now();
    const [rows] = await pool.execute('SELECT 1 as ping, NOW() as server_time');
    const responseTime = Date.now() - startTime;
    
    if (rows && rows.length > 0) {
      detailed.database.status = 'connected';
      detailed.database.message = '数据库连接正常';
      detailed.database.responseTime = `${responseTime}ms`;
      detailed.database.serverTime = rows[0].server_time;
    } else {
      detailed.database.status = 'error';
      detailed.database.message = '数据库查询失败';
      detailed.status = 'degraded';
    }
  } catch (error) {
    detailed.database.status = 'error';
    detailed.database.message = error.message || '数据库连接失败';
    detailed.database.errorCode = error.code;
    detailed.status = 'error';
    logger.error('详细健康检查 - 数据库连接失败:', error);
  }

  const statusCode = detailed.status === 'ok' ? 200 : 
                     detailed.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(detailed);
});

/**
 * 格式化运行时间
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);

  return parts.join(' ');
}

export default router;

