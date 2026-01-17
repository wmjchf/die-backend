import './src/config/env.js';
import { get, run, all } from './src/db/index.js';
import { logger } from './src/utils/logger.js';

/**
 * 恢复正常的短信发送时间配置
 * 使用方法: node restore-sms-timing.js [用户ID]
 * 如果不提供用户ID，会恢复所有用户
 * 
 * 恢复为：
 * - 签到间隔: 24 小时
 * - 宽限期: 2 小时
 */
async function restoreSmsTiming() {
  try {
    const userId = process.argv[2];
    
    // 正常配置：24小时签到间隔，2小时宽限期
    const checkInIntervalHours = 24;
    const gracePeriodHours = 2;

    logger.info('\n========== 恢复短信发送时间配置 ==========');
    logger.info(`签到间隔: ${checkInIntervalHours} 小时`);
    logger.info(`宽限期: ${gracePeriodHours} 小时`);
    logger.info('==========================================\n');

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
      
      logger.info(`✓ 已恢复用户 ID ${userId} 的配置`);
      logger.info(`  签到间隔: ${checkInIntervalHours} 小时`);
      logger.info(`  宽限期: ${gracePeriodHours} 小时`);
    } else {
      const result = await run(
        `UPDATE users 
         SET check_in_interval_hours = ?, 
             grace_period_hours = ?`,
        [checkInIntervalHours, gracePeriodHours]
      );
      
      logger.info(`✓ 已恢复所有用户（${result.changes} 个）的配置`);
      logger.info(`  签到间隔: ${checkInIntervalHours} 小时`);
      logger.info(`  宽限期: ${gracePeriodHours} 小时`);
    }

    logger.info('\n✅ 配置恢复完成！\n');
    
    process.exit(0);
  } catch (error) {
    logger.error('恢复短信发送时间失败:', error);
    process.exit(1);
  }
}

restoreSmsTiming();
