/**
 * 查看数据库中时间字段的存储格式
 * 
 * 使用方法：
 * node view_timestamp_format.js
 */

// 首先加载环境变量配置
import './src/config/env.js';

import { get, all, closePool } from './src/db/index.js';
import { logger } from './src/utils/logger.js';

async function viewTimestampFormat() {
  try {
    logger.info('开始查看数据库中时间字段的存储格式...\n');

    // 获取最新的签到记录
    const checkins = await all(
      `SELECT 
        id,
        user_id,
        check_in_time,
        next_check_in_deadline,
        -- 查看原始存储格式（MySQL 内部存储）
        UNIX_TIMESTAMP(check_in_time) as check_in_time_unix,
        UNIX_TIMESTAMP(next_check_in_deadline) as next_deadline_unix,
        -- 查看 MySQL 显示的格式（会根据时区转换）
        check_in_time as check_in_time_display,
        next_check_in_deadline as next_deadline_display,
        -- 查看 UTC 格式
        CONVERT_TZ(check_in_time, @@session.time_zone, '+00:00') as check_in_time_utc,
        CONVERT_TZ(next_check_in_deadline, @@session.time_zone, '+00:00') as next_deadline_utc
      FROM checkins 
      ORDER BY check_in_time DESC 
      LIMIT 5`
    );

    if (checkins.length === 0) {
      logger.info('暂无签到记录');
      return;
    }

    logger.info(`找到 ${checkins.length} 条签到记录\n`);
    logger.info('='.repeat(80));
    logger.info('时间字段存储格式说明：');
    logger.info('='.repeat(80));
    logger.info('');
    logger.info('1. TIMESTAMP 类型在 MySQL 中：');
    logger.info('   - 内部存储：UTC 时间戳（从 1970-01-01 00:00:00 UTC 开始的秒数）');
    logger.info('   - 显示格式：根据 MySQL 会话时区自动转换');
    logger.info('   - 时区设置：连接时区设置为 UTC (+00:00)');
    logger.info('');
    logger.info('2. 字段说明：');
    logger.info('   - check_in_time: 签到时间');
    logger.info('   - next_check_in_deadline: 下次签到截止时间');
    logger.info('   - next_deadline: 这是接口返回的字段，不是数据库字段');
    logger.info('');
    logger.info('='.repeat(80));
    logger.info('实际数据：');
    logger.info('='.repeat(80));
    logger.info('');

    checkins.forEach((checkin, index) => {
      logger.info(`\n记录 #${index + 1} (ID: ${checkin.id}, UserID: ${checkin.user_id})`);
      logger.info('-'.repeat(80));
      
      // 检查字段类型
      logger.info('check_in_time:');
      logger.info(`  类型: ${typeof checkin.check_in_time}`);
      logger.info(`  值: ${checkin.check_in_time}`);
      logger.info(`  是否为 Date 对象: ${checkin.check_in_time instanceof Date ? '是' : '否'}`);
      if (checkin.check_in_time instanceof Date) {
        logger.info(`  UTC 字符串: ${checkin.check_in_time.toUTCString()}`);
        logger.info(`  ISO 字符串: ${checkin.check_in_time.toISOString()}`);
        logger.info(`  时间戳（毫秒）: ${checkin.check_in_time.getTime()}`);
      }
      logger.info(`  MySQL UNIX 时间戳（秒）: ${checkin.check_in_time_unix}`);
      logger.info(`  MySQL 显示格式: ${checkin.check_in_time_display}`);
      logger.info(`  MySQL UTC 格式: ${checkin.check_in_time_utc}`);
      
      logger.info('');
      logger.info('next_check_in_deadline:');
      logger.info(`  类型: ${typeof checkin.next_check_in_deadline}`);
      logger.info(`  值: ${checkin.next_check_in_deadline}`);
      logger.info(`  是否为 Date 对象: ${checkin.next_check_in_deadline instanceof Date ? '是' : '否'}`);
      if (checkin.next_check_in_deadline instanceof Date) {
        logger.info(`  UTC 字符串: ${checkin.next_check_in_deadline.toUTCString()}`);
        logger.info(`  ISO 字符串: ${checkin.next_check_in_deadline.toISOString()}`);
        logger.info(`  时间戳（毫秒）: ${checkin.next_check_in_deadline.getTime()}`);
      }
      logger.info(`  MySQL UNIX 时间戳（秒）: ${checkin.next_deadline_unix}`);
      logger.info(`  MySQL 显示格式: ${checkin.next_deadline_display}`);
      logger.info(`  MySQL UTC 格式: ${checkin.next_deadline_utc}`);
    });

    // 查看 MySQL 时区设置
    const timezoneInfo = await get('SELECT @@global.time_zone as global_tz, @@session.time_zone as session_tz');
    logger.info('');
    logger.info('='.repeat(80));
    logger.info('MySQL 时区设置：');
    logger.info('='.repeat(80));
    logger.info(`全局时区: ${timezoneInfo.global_tz}`);
    logger.info(`会话时区: ${timezoneInfo.session_tz}`);
    logger.info('');

    logger.info('='.repeat(80));
    logger.info('总结：');
    logger.info('='.repeat(80));
    logger.info('1. 数据库字段类型：TIMESTAMP');
    logger.info('2. 数据库内部存储：UTC 时间戳（秒）');
    logger.info('3. mysql2 读取时：自动转换为 JavaScript Date 对象（UTC）');
    logger.info('4. 数据库连接时区：UTC (+00:00)');
    logger.info('5. next_deadline 不是数据库字段，是接口返回时从 next_check_in_deadline 复制的值');
    logger.info('');

  } catch (error) {
    logger.error('查看失败:', error);
    process.exit(1);
  } finally {
    await closePool();
    process.exit(0);
  }
}

// 运行
viewTimestampFormat();

