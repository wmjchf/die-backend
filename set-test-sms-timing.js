import './src/config/env.js';
import { get, run, all } from './src/db/index.js';
import { logger } from './src/utils/logger.js';

/**
 * 设置测试用的短信发送时间（签到后1分钟发送短信）
 * 使用方法: node set-test-sms-timing.js [用户ID]
 * 如果不提供用户ID，会更新所有用户
 */
async function setTestSmsTiming() {
  try {
    const userId = process.argv[2];
    
    // 测试配置：1分钟后发送短信（签到间隔1分钟，宽限期0）
    const checkInIntervalMinutes = 1;
    const gracePeriodMinutes = 0;
    const checkInIntervalHours = checkInIntervalMinutes / 60; // 约 0.0167 小时
    const gracePeriodHours = gracePeriodMinutes / 60; // 0 小时

    logger.info('\n========== 设置测试短信发送时间 ==========');
    logger.info(`签到间隔: ${checkInIntervalMinutes} 分钟 (${checkInIntervalHours.toFixed(4)} 小时)`);
    logger.info(`宽限期: ${gracePeriodMinutes} 分钟 (${gracePeriodHours} 小时)`);
    logger.info('说明: 签到后1分钟到期，立即发送短信');
    logger.info('==========================================\n');

    // 修改数据库字段类型为 DECIMAL 以支持小数
    logger.info('正在修改数据库字段类型以支持小数...');
    try {
      await run(`
        ALTER TABLE users 
        MODIFY COLUMN check_in_interval_hours DECIMAL(10, 4) DEFAULT 24
      `);
      logger.info('✓ check_in_interval_hours 字段已更新为 DECIMAL');
    } catch (error) {
      if (error.message.includes('doesn\'t exist') || error.message.includes('Duplicate')) {
        logger.warn('字段可能已经是 DECIMAL 类型，继续...');
      } else {
        throw error;
      }
    }

    try {
      await run(`
        ALTER TABLE users 
        MODIFY COLUMN grace_period_hours DECIMAL(10, 4) DEFAULT 2
      `);
      logger.info('✓ grace_period_hours 字段已更新为 DECIMAL');
    } catch (error) {
      if (error.message.includes('doesn\'t exist') || error.message.includes('Duplicate')) {
        logger.warn('字段可能已经是 DECIMAL 类型，继续...');
      } else {
        throw error;
      }
    }

    // 更新用户配置
    if (userId) {
      const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) {
        logger.error(`用户 ID ${userId} 不存在`);
        process.exit(1);
      }
      
      await run(
        `UPDATE users 
         SET check_in_interval_hours = ?, 
             grace_period_hours = ? 
         WHERE id = ?`,
        [checkInIntervalHours, gracePeriodHours, userId]
      );
      
      logger.info(`✓ 已更新用户 ID ${userId} 的配置`);
      logger.info(`  签到间隔: ${checkInIntervalMinutes} 分钟`);
      logger.info(`  宽限期: ${gracePeriodMinutes} 分钟`);
    } else {
      const result = await run(
        `UPDATE users 
         SET check_in_interval_hours = ?, 
             grace_period_hours = ?`,
        [checkInIntervalHours, gracePeriodHours]
      );
      
      logger.info(`✓ 已更新所有用户（${result.changes} 个）的配置`);
      logger.info(`  签到间隔: ${checkInIntervalMinutes} 分钟`);
      logger.info(`  宽限期: ${gracePeriodMinutes} 分钟`);
    }

    logger.info('\n✅ 测试配置已设置完成！');
    logger.info('📝 测试流程：');
    logger.info('   1. 执行一次签到');
    logger.info('   2. 等待 1 分钟后，系统会自动发送短信');
    logger.info('   3. 测试完成后，运行恢复脚本: node restore-sms-timing.js\n');
    
    process.exit(0);
  } catch (error) {
    logger.error('设置测试短信发送时间失败:', error);
    process.exit(1);
  }
}

setTestSmsTiming();
