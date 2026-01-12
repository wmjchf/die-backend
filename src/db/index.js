import mysql from 'mysql2/promise';
import { logger } from '../utils/logger.js';

// MySQL 连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dieapp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};
// 验证数据库配置
if (!process.env.DB_PASSWORD && process.env.NODE_ENV !== 'test') {
  logger.warn('警告: DB_PASSWORD 未设置，如果 MySQL 需要密码，连接将失败');
  logger.warn('请确保已创建 .env 文件并配置了数据库连接信息');
}

let pool = null;

// 获取数据库连接池
export function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    logger.info('MySQL 连接池创建成功');
  }
  return pool;
}

// 执行 SQL（INSERT, UPDATE, DELETE）
export async function run(sql, params = []) {
  try {
    const pool = getPool();
    const [result] = await pool.execute(sql, params);
    return {
      lastID: result.insertId,
      changes: result.affectedRows
    };
  } catch (error) {
    logger.error('SQL 执行失败:', error);
    throw error;
  }
}

// 查询单条记录
export async function get(sql, params = []) {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  } catch (error) {
    logger.error('SQL 查询失败:', error);
    throw error;
  }
}

// 查询多条记录
export async function all(sql, params = []) {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    logger.error('SQL 查询失败:', error);
    throw error;
  }
}

// 初始化数据库表
export async function initDatabase() {
  try {
    // 先测试连接
    logger.info(`正在连接 MySQL (${dbConfig.host}:${dbConfig.port})...`);
    
    // 确保数据库存在
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });
    
    logger.info('MySQL 连接成功');
    
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.end();
    logger.info(`数据库 ${dbConfig.database} 已准备就绪`);

    const pool = getPool();

    // 用户表
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(100) UNIQUE NOT NULL,
        nickname VARCHAR(100),
        timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
        check_in_interval_hours INT DEFAULT 24,
        grace_period_hours INT DEFAULT 2,
        reminder_before_hours INT DEFAULT 1,
        is_paused TINYINT(1) DEFAULT 0,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 如果表已存在但 phone 字段长度不够，尝试修改
    try {
      await run(`
        ALTER TABLE users 
        MODIFY COLUMN phone VARCHAR(100) UNIQUE NOT NULL
      `);
      logger.info('phone 字段长度已更新为 VARCHAR(100)');
    } catch (error) {
      // 忽略错误（可能是字段已经是正确长度，或者表不存在）
      if (!error.message.includes('Duplicate') && !error.message.includes('doesn\'t exist')) {
        logger.warn('更新 phone 字段长度时出现警告:', error.message);
      }
    }

    // 紧急联系人表
    await run(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        is_primary TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_contacts_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Check-in 记录表
    await run(`
      CREATE TABLE IF NOT EXISTS checkins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        next_check_in_deadline DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_checkins_user_id (user_id),
        INDEX idx_checkins_deadline (next_check_in_deadline)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 短信发送记录表
    await run(`
      CREATE TABLE IF NOT EXISTS sms_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        contact_id INT NOT NULL,
        sms_count INT DEFAULT 1,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'sent',
        error_message TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
        INDEX idx_sms_logs_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    logger.info('数据库表初始化完成');
  } catch (error) {
    logger.error('数据库初始化失败:', error.message);
    
    // 提供更友好的错误提示
    if (error.code === 'ER_ACCESS_DENIED_ERROR' || error.message.includes('Access denied')) {
      logger.error('');
      logger.error('=== 数据库连接失败 ===');
      logger.error('可能的原因：');
      logger.error('1. MySQL 密码未配置或配置错误');
      logger.error('2. 请检查 .env 文件中的以下配置：');
      logger.error(`   DB_HOST=${dbConfig.host}`);
      logger.error(`   DB_PORT=${dbConfig.port}`);
      logger.error(`   DB_USER=${dbConfig.user}`);
      logger.error(`   DB_PASSWORD=${dbConfig.password ? '***' : '(未设置)'}`);
      logger.error(`   DB_NAME=${dbConfig.database}`);
      logger.error('');
      logger.error('解决方法：');
      logger.error('1. 复制 env.example 为 .env: cp env.example .env');
      logger.error('2. 编辑 .env 文件，设置正确的 MySQL 密码');
      logger.error('3. 如果 MySQL root 用户没有密码，可以设置 DB_PASSWORD= 留空');
      logger.error('4. 或者创建新的 MySQL 用户并配置相应权限');
      logger.error('');
    } else if (error.code === 'ECONNREFUSED') {
      logger.error('');
      logger.error('=== 数据库连接失败 ===');
      logger.error('无法连接到 MySQL 服务器');
      logger.error('请确保 MySQL 服务正在运行');
      logger.error(`尝试连接: ${dbConfig.host}:${dbConfig.port}`);
      logger.error('');
    }
    
    throw error;
  }
}

// 关闭数据库连接
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('数据库连接池已关闭');
  }
}

