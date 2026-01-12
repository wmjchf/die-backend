import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error('错误:', err);

  // 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: '验证失败',
      details: err.message
    });
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: '无效的认证令牌'
    });
  }

  // 数据库错误
  if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT') {
    return res.status(400).json({
      error: '数据冲突',
      details: err.message
    });
  }

  // MySQL 外键约束错误
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({
      error: '数据关联错误',
      details: err.message
    });
  }

  // 默认错误
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

