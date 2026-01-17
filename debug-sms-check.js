import './src/config/env.js';
import { all, get } from './src/db/index.js';
import { logger } from './src/utils/logger.js';

/**
 * 调试脚本：查看为什么没有用户被处理
 */
async function debugSmsCheck() {
  try {
    logger.info('\n========== 调试短信检查 ==========\n');
    
    const now = new Date().toISOString();
    logger.info(`当前时间: ${now}\n`);
    
    // 1. 查看所有用户
    const allUsers = await all('SELECT id, phone, nickname, is_paused, check_in_interval_hours, grace_period_hours FROM users');
    logger.info(`总用户数: ${allUsers.length}`);
    if (allUsers.length === 0) {
      logger.warn('⚠️  数据库中没有用户！');
      return;
    }
    
    logger.info('\n用户列表:');
    for (const user of allUsers) {
      logger.info(`  - 用户 ID: ${user.id}, 手机: ${user.phone}, 暂停: ${user.is_paused === 1 ? '是' : '否'}`);
      logger.info(`    签到间隔: ${user.check_in_interval_hours} 小时, 宽限期: ${user.grace_period_hours} 小时`);
    }
    
    // 2. 查看未暂停的用户
    const activeUsers = allUsers.filter(u => u.is_paused === 0);
    logger.info(`\n未暂停的用户数: ${activeUsers.length}`);
    
    // 3. 查看每个用户的签到记录
    logger.info('\n签到记录:');
    for (const user of activeUsers) {
      const checkins = await all(
        'SELECT * FROM checkins WHERE user_id = ? ORDER BY check_in_time DESC LIMIT 1',
        [user.id]
      );
      
      if (checkins.length === 0) {
        logger.info(`  用户 ${user.id}: 没有签到记录`);
      } else {
        const latest = checkins[0];
        const deadline = new Date(latest.next_check_in_deadline);
        const isOverdue = new Date(now) > deadline;
        const gracePeriodEnd = new Date(deadline.getTime() + (user.grace_period_hours || 0) * 60 * 60 * 1000);
        const isInGracePeriod = new Date(now) < gracePeriodEnd;
        
        logger.info(`  用户 ${user.id}:`);
        logger.info(`    最后签到: ${latest.check_in_time}`);
        logger.info(`    截止时间: ${latest.next_check_in_deadline}`);
        logger.info(`    是否超时: ${isOverdue ? '是' : '否'}`);
        logger.info(`    宽限期结束: ${gracePeriodEnd.toISOString()}`);
        logger.info(`    是否在宽限期内: ${isInGracePeriod ? '是' : '否'}`);
        
        if (isOverdue && !isInGracePeriod) {
          logger.info(`    ✅ 应该发送短信！`);
        } else if (isOverdue && isInGracePeriod) {
          logger.info(`    ⏳ 仍在宽限期内，等待中...`);
        } else {
          logger.info(`    ⏰ 还未到期`);
        }
      }
    }
    
    // 4. 模拟查询（和定时任务一样的查询）
    logger.info('\n模拟定时任务查询:');
    const overdueUsers = await all(`
      SELECT DISTINCT u.*, 
             MAX(c.next_check_in_deadline) as last_deadline,
             MAX(c.check_in_time) as last_check_in
      FROM users u
      LEFT JOIN checkins c ON u.id = c.user_id
      WHERE u.is_paused = 0
        AND (c.next_check_in_deadline IS NULL OR c.next_check_in_deadline < ?)
      GROUP BY u.id
    `, [now]);
    
    logger.info(`查询到的超时用户数: ${overdueUsers.length}`);
    for (const user of overdueUsers) {
      logger.info(`  - 用户 ID: ${user.id}, 截止时间: ${user.last_deadline || 'NULL'}`);
    }
    
    logger.info('\n====================================\n');
    
    process.exit(0);
  } catch (error) {
    logger.error('调试失败:', error);
    process.exit(1);
  }
}

debugSmsCheck();
