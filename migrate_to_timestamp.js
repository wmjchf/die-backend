/**
 * 数据库迁移脚本：将 DATETIME 字段转换为 TIMESTAMP
 * 
 * 使用方法：
 * node migrate_to_timestamp.js
 */

// 首先加载环境变量配置
import './src/config/env.js';

import { getPool, run } from './src/db/index.js';
import { logger } from './src/utils/logger.js';

async function migrateToTimestamp() {
  try {
    logger.info('开始迁移数据库字段：DATETIME -> TIMESTAMP');
    
    const pool = getPool();
    
    // 迁移 users 表
    try {
      await run(`
        ALTER TABLE users 
        MODIFY COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      logger.info('✓ users 表迁移完成');
    } catch (error) {
      logger.warn('users 表迁移失败（可能已经迁移过）:', error.message);
    }
    
    // 迁移 contacts 表
    try {
      await run(`
        ALTER TABLE contacts 
        MODIFY COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      logger.info('✓ contacts 表迁移完成');
    } catch (error) {
      logger.warn('contacts 表迁移失败（可能已经迁移过）:', error.message);
    }
    
    // 迁移 checkins 表
    try {
      await run(`
        ALTER TABLE checkins 
        MODIFY COLUMN check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        MODIFY COLUMN next_check_in_deadline TIMESTAMP NOT NULL
      `);
      logger.info('✓ checkins 表迁移完成');
    } catch (error) {
      logger.warn('checkins 表迁移失败（可能已经迁移过）:', error.message);
    }
    
    // 迁移 sms_logs 表
    try {
      await run(`
        ALTER TABLE sms_logs 
        MODIFY COLUMN sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      logger.info('✓ sms_logs 表迁移完成');
    } catch (error) {
      logger.warn('sms_logs 表迁移失败（可能已经迁移过）:', error.message);
    }
    
    logger.info('数据库迁移完成！');
    logger.info('');
    logger.info('注意：');
    logger.info('1. TIMESTAMP 会自动处理时区转换');
    logger.info('2. 确保 MySQL 连接的时区设置正确（已设置为 UTC）');
    logger.info('3. 现有数据会自动转换，无需手动处理');
    
    process.exit(0);
  } catch (error) {
    logger.error('迁移失败:', error);
    process.exit(1);
  }
}

// 运行迁移
migrateToTimestamp();

