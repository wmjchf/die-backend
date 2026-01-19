import cron from 'node-cron';
import { all, get, run } from '../db/index.js';
import { sendSMS, logSMS } from './smsService.js';
import { logger } from '../utils/logger.js';
import { formatMySQLDateTime, getChinaTime, parseMySQLDateTime } from '../utils/timezone.js';

const MAX_SMS_COUNT = parseInt(process.env.MAX_SMS_COUNT || '3');
const SMS_INTERVAL_MINUTES = parseInt(process.env.SMS_INTERVAL_MINUTES || '30');

async function checkAndSendReminders() {
  try {
    logger.info('开始检查超时用户...');
    
    const now = getChinaTime(); // 使用中国时区时间
    const nowMySQL = formatMySQLDateTime(now);
    
    // 查找所有超过截止时间且未暂停的用户
    const overdueUsers = await all(`
      SELECT DISTINCT u.*, 
             MAX(c.next_check_in_deadline) as last_deadline,
             MAX(c.check_in_time) as last_check_in
      FROM users u
      LEFT JOIN checkins c ON u.id = c.user_id
      WHERE u.is_paused = 0
        AND (c.next_check_in_deadline IS NULL OR c.next_check_in_deadline < ?)
      GROUP BY u.id
    `, [nowMySQL]);

    for (const user of overdueUsers) {
      await processOverdueUser(user, nowMySQL);
    }

    logger.info(`检查完成，处理了 ${overdueUsers.length} 个用户`);
  } catch (error) {
    logger.error('检查超时用户失败:', error);
  }
}

/**
 * 处理超时的用户
 */
async function processOverdueUser(user, nowMySQL) {
  try {
    const deadline = user.last_deadline;
    if (!deadline) return;

    const deadlineTime = parseMySQLDateTime(deadline); // 解析为中国时区时间
    const nowTime = getChinaTime(); // 使用中国时区时间
    const gracePeriodHours = user.grace_period_hours || 2;
    const gracePeriodEnd = new Date(deadlineTime.getTime() + gracePeriodHours * 60 * 60 * 1000);

    // 检查是否已过宽限期
    if (nowTime < gracePeriodEnd) {
      logger.debug(`用户 ${user.id} 仍在宽限期内，跳过`);
      return;
    }

    // 获取用户的紧急联系人
    const contacts = await all(
      'SELECT * FROM contacts WHERE user_id = ? ORDER BY is_primary DESC, id ASC',
      [user.id]
    );

    if (contacts.length === 0) {
      logger.warn(`用户 ${user.id} 没有设置紧急联系人`);
      return;
    }

    // 检查已发送的短信数量（今日）
    const today = new Date().toISOString().split('T')[0];
    const smsLogs = await all(
      `SELECT MAX(sms_count) as max_count, MAX(sent_at) as last_sent
       FROM sms_logs 
       WHERE user_id = ? 
         AND DATE(sent_at) = ?
       ORDER BY sent_at DESC
       LIMIT 1`,
      [user.id, today]
    );

    const lastSMS = smsLogs[0];
    const currentSmsCount = lastSMS?.max_count || 0;

    if (currentSmsCount >= MAX_SMS_COUNT) {
      logger.info(`用户 ${user.id} 今日已发送 ${currentSmsCount} 条短信，达到上限`);
      return;
    }

    // 检查是否需要发送（第一条立即发送，后续需要间隔）
    if (currentSmsCount > 0) {
      const lastSentTime = new Date(lastSMS.last_sent);
      const minutesSinceLastSMS = (nowTime - lastSentTime) / (1000 * 60);
      
      if (minutesSinceLastSMS < SMS_INTERVAL_MINUTES) {
        logger.debug(`用户 ${user.id} 距离上次发送不足 ${SMS_INTERVAL_MINUTES} 分钟，跳过`);
        return;
      }
    }

    // 发送短信给所有联系人
    const newSmsCount = currentSmsCount + 1;
    for (const contact of contacts) {
      const success = await sendSMS(
        contact.phone,
        user.nickname || user.phone,
        user.phone
      );

      await logSMS(
        user.id,
        contact.id,
        newSmsCount,
        success ? 'sent' : 'failed',
        success ? null : '发送失败'
      );

      if (success) {
        logger.info(`已向 ${contact.phone} 发送第 ${newSmsCount} 条提醒短信（用户 ${user.id}）`);
      }
    }
  } catch (error) {
    logger.error(`处理超时用户 ${user.id} 失败:`, error);
  }
}

/**
 * 发送到期前提醒（提前 1 小时）
 */
async function sendReminderNotifications() {
  try {
    logger.info('开始检查需要发送提醒的用户...');
    
    const now = getChinaTime(); // 使用中国时区时间
    const reminderTime = new Date(now.getTime() + 60 * 60 * 1000); // 1小时后
    const nowMySQL = formatMySQLDateTime(now);
    const reminderTimeMySQL = formatMySQLDateTime(reminderTime);
    
    // 查找即将到期的用户
    const usersToRemind = await all(`
      SELECT DISTINCT u.*, c.next_check_in_deadline
      FROM users u
      INNER JOIN checkins c ON u.id = c.user_id
      WHERE u.is_paused = 0
        AND c.next_check_in_deadline BETWEEN ? AND ?
        AND NOT EXISTS (
          SELECT 1 FROM checkins c2 
          WHERE c2.user_id = u.id 
            AND c2.check_in_time > c.check_in_time
        )
    `, [nowMySQL, reminderTimeMySQL]);

    // TODO: 发送推送通知（这里暂时只记录日志）
    for (const user of usersToRemind) {
      logger.info(`用户 ${user.id} 将在 1 小时内到期，需要发送提醒通知`);
    }

    logger.info(`检查完成，${usersToRemind.length} 个用户需要提醒`);
  } catch (error) {
    logger.error('发送提醒通知失败:', error);
  }
}

/**
 * 初始化定时任务
 */
export function initCronJobs() {
  // 每 5 分钟检查一次超时用户
  cron.schedule('*/5 * * * *', checkAndSendReminders);
  logger.info('已启动定时任务：每 5 分钟检查超时用户');

  // 每 10 分钟检查一次需要发送提醒的用户
  cron.schedule('*/10 * * * *', sendReminderNotifications);
  logger.info('已启动定时任务：每 10 分钟检查需要提醒的用户');
}

