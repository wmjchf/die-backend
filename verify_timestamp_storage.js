/**
 * 验证 TIMESTAMP 字段的内部存储格式
 * 
 * 使用方法：
 * node verify_timestamp_storage.js
 */

// 首先加载环境变量配置
import './src/config/env.js';

import { get, all, closePool } from './src/db/index.js';
import { logger } from './src/utils/logger.js';

async function verifyTimestampStorage() {
  try {
    logger.info('验证 TIMESTAMP 字段的内部存储格式...\n');

    // 查询并显示多种格式
    const checkins = await all(
      `SELECT 
        id,
        user_id,
        -- 显示格式（MySQL 自动转换）
        check_in_time as display_format,
        next_check_in_deadline as deadline_display,
        -- 内部存储：UNIX 时间戳（秒）
        UNIX_TIMESTAMP(check_in_time) as check_in_timestamp_seconds,
        UNIX_TIMESTAMP(next_check_in_deadline) as deadline_timestamp_seconds,
        -- 转换为毫秒（JavaScript 使用）
        UNIX_TIMESTAMP(check_in_time) * 1000 as check_in_timestamp_millis,
        UNIX_TIMESTAMP(next_check_in_deadline) * 1000 as deadline_timestamp_millis,
        -- UTC 格式
        CONVERT_TZ(check_in_time, @@session.time_zone, '+00:00') as check_in_utc,
        CONVERT_TZ(next_check_in_deadline, @@session.time_zone, '+00:00') as deadline_utc
      FROM checkins 
      ORDER BY check_in_time DESC 
      LIMIT 3`
    );

    if (checkins.length === 0) {
      logger.info('暂无签到记录');
      return;
    }

    logger.info('='.repeat(80));
    logger.info('TIMESTAMP 存储格式说明：');
    logger.info('='.repeat(80));
    logger.info('');
    logger.info('MySQL TIMESTAMP 类型：');
    logger.info('1. 内部存储：UTC 时间戳（从 1970-01-01 00:00:00 UTC 开始的秒数）');
    logger.info('2. 显示格式：根据 MySQL 时区自动转换为 YYYY-MM-DD HH:MM:SS');
    logger.info('3. 数据库管理工具显示的是"显示格式"，不是原始时间戳');
    logger.info('4. 但实际存储的确实是时间戳（可以通过 UNIX_TIMESTAMP() 函数查看）');
    logger.info('');
    logger.info('='.repeat(80));
    logger.info('实际数据对比：');
    logger.info('='.repeat(80));
    logger.info('');

    checkins.forEach((checkin, index) => {
      logger.info(`\n记录 #${index + 1} (ID: ${checkin.id})`);
      logger.info('-'.repeat(80));
      
      logger.info('check_in_time:');
      logger.info(`  数据库管理工具显示（显示格式）: ${checkin.display_format}`);
      logger.info(`  内部存储（时间戳-秒）: ${checkin.check_in_timestamp_seconds}`);
      logger.info(`  内部存储（时间戳-毫秒）: ${checkin.check_in_timestamp_millis}`);
      logger.info(`  UTC 格式: ${checkin.check_in_utc}`);
      
      logger.info('');
      logger.info('next_check_in_deadline:');
      logger.info(`  数据库管理工具显示（显示格式）: ${checkin.deadline_display}`);
      logger.info(`  内部存储（时间戳-秒）: ${checkin.deadline_timestamp_seconds}`);
      logger.info(`  内部存储（时间戳-毫秒）: ${checkin.deadline_timestamp_millis}`);
      logger.info(`  UTC 格式: ${checkin.deadline_utc}`);
      
      // 验证：将时间戳转换回日期，应该和显示格式一致
      const timestampDate = new Date(checkin.check_in_timestamp_millis);
      logger.info('');
      logger.info('验证（将时间戳转换回日期）:');
      logger.info(`  JavaScript new Date(${checkin.check_in_timestamp_millis}):`);
      logger.info(`    UTC: ${timestampDate.toUTCString()}`);
      logger.info(`    ISO: ${timestampDate.toISOString()}`);
      logger.info(`    本地: ${timestampDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    });

    logger.info('');
    logger.info('='.repeat(80));
    logger.info('结论：');
    logger.info('='.repeat(80));
    logger.info('✅ 数据库内部存储的确实是时间戳（秒数）');
    logger.info('✅ 数据库管理工具显示的是转换后的可读格式');
    logger.info('✅ 这是 MySQL TIMESTAMP 类型的正常行为');
    logger.info('✅ 通过 UNIX_TIMESTAMP() 函数可以查看原始时间戳');
    logger.info('');

  } catch (error) {
    logger.error('验证失败:', error);
    process.exit(1);
  } finally {
    await closePool();
    process.exit(0);
  }
}

// 运行
verifyTimestampStorage();

