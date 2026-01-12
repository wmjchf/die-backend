// 清空数据库数据脚本
import './src/config/env.js';
import { getPool, all, run, closePool } from './src/db/index.js';
import { logger } from './src/utils/logger.js';

async function viewAndClearData() {
  try {
    const pool = getPool();
    
    console.log('\n========== 查看当前数据 ==========\n');
    
    // 查看用户数据
    const users = await all('SELECT * FROM users');
    console.log(`用户表 (users): ${users.length} 条记录`);
    if (users.length > 0) {
      console.log('用户数据:');
      users.forEach((user, index) => {
        console.log(`  [${index + 1}] ID: ${user.id}, Phone: ${user.phone}, Nickname: ${user.nickname}, IsPaused: ${user.is_paused}`);
      });
    }
    
    // 查看签到数据
    const checkins = await all('SELECT * FROM checkins ORDER BY check_in_time DESC LIMIT 10');
    console.log(`\n签到表 (checkins): ${checkins.length} 条记录（显示最近10条）`);
    if (checkins.length > 0) {
      console.log('签到数据:');
      checkins.forEach((checkin, index) => {
        console.log(`  [${index + 1}] ID: ${checkin.id}, UserID: ${checkin.user_id}, Time: ${checkin.check_in_time}`);
      });
    }
    
    // 查看联系人数据
    const contacts = await all('SELECT * FROM contacts');
    console.log(`\n联系人表 (contacts): ${contacts.length} 条记录`);
    if (contacts.length > 0) {
      console.log('联系人数据:');
      contacts.forEach((contact, index) => {
        console.log(`  [${index + 1}] ID: ${contact.id}, UserID: ${contact.user_id}, Name: ${contact.name}, Phone: ${contact.phone}, IsPrimary: ${contact.is_primary}`);
      });
    }
    
    // 查看短信记录
    const smsLogs = await all('SELECT * FROM sms_logs ORDER BY sent_at DESC LIMIT 10');
    console.log(`\n短信记录表 (sms_logs): ${smsLogs.length} 条记录（显示最近10条）`);
    if (smsLogs.length > 0) {
      console.log('短信记录:');
      smsLogs.forEach((log, index) => {
        console.log(`  [${index + 1}] ID: ${log.id}, UserID: ${log.user_id}, ContactID: ${log.contact_id}, Status: ${log.status}, SentAt: ${log.sent_at}`);
      });
    }
    
    console.log('\n========== 开始清空数据 ==========\n');
    
    // 清空数据（注意外键约束顺序）
    await run('DELETE FROM sms_logs');
    console.log('✓ 已清空短信记录表 (sms_logs)');
    
    await run('DELETE FROM checkins');
    console.log('✓ 已清空签到表 (checkins)');
    
    await run('DELETE FROM contacts');
    console.log('✓ 已清空联系人表 (contacts)');
    
    await run('DELETE FROM users');
    console.log('✓ 已清空用户表 (users)');
    
    console.log('\n========== 数据清空完成 ==========\n');
    
    // 再次查看确认
    const usersAfter = await all('SELECT COUNT(*) as count FROM users');
    const checkinsAfter = await all('SELECT COUNT(*) as count FROM checkins');
    const contactsAfter = await all('SELECT COUNT(*) as count FROM contacts');
    const smsLogsAfter = await all('SELECT COUNT(*) as count FROM sms_logs');
    
    console.log('清空后的数据统计:');
    console.log(`  用户表: ${usersAfter[0].count} 条`);
    console.log(`  签到表: ${checkinsAfter[0].count} 条`);
    console.log(`  联系人表: ${contactsAfter[0].count} 条`);
    console.log(`  短信记录表: ${smsLogsAfter[0].count} 条`);
    
  } catch (error) {
    logger.error('清空数据失败:', error);
    console.error('错误详情:', error.message);
    process.exit(1);
  } finally {
    await closePool();
    process.exit(0);
  }
}

// 执行
viewAndClearData();

