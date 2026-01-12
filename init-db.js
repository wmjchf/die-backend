// 数据库初始化脚本
import './src/config/env.js';
import { initDatabase, closePool } from './src/db/index.js';
import { logger } from './src/utils/logger.js';

async function init() {
  try {
    logger.info('开始初始化数据库...');
    await initDatabase();
    logger.info('✅ 数据库初始化完成');
    process.exit(0);
  } catch (error) {
    logger.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

init();

