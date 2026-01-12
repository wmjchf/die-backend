// 数据库迁移脚本：增加 phone 字段长度
// 使用方法：node migrate_phone_length.js

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dieapp'
  });

  try {
    console.log('开始迁移 phone 字段长度...');
    
    // 修改 phone 字段长度为 VARCHAR(100)
    await connection.execute(`
      ALTER TABLE users 
      MODIFY COLUMN phone VARCHAR(100) UNIQUE NOT NULL
    `);
    
    console.log('✅ phone 字段长度已更新为 VARCHAR(100)');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column')) {
      console.log('⚠️  字段可能已经存在或已修改');
    } else if (error.message.includes('doesn\'t exist')) {
      console.log('⚠️  表不存在，将在下次初始化时自动创建');
    } else {
      console.error('❌ 迁移失败:', error.message);
      throw error;
    }
  } finally {
    await connection.end();
  }
}

migrate().catch(console.error);
