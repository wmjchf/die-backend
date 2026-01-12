// 环境变量配置模块
// 这个文件必须在其他模块之前被导入，以确保环境变量已加载

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量（明确指定 .env 文件路径）
const envPath = path.resolve(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('无法从指定路径加载 .env 文件:', result.error.message);
  console.warn(`尝试路径: ${envPath}`);
  console.warn('尝试从当前工作目录加载...');
  const fallbackResult = dotenv.config(); // 回退到默认行为
  if (fallbackResult.error) {
    console.warn('从当前工作目录也无法加载 .env 文件');
  } else {
    console.log('✅ 已从当前工作目录加载 .env 文件');
  }
} else {
  console.log(`✅ 已加载环境变量文件: ${envPath}`);
}

// 导出配置对象（可选，方便其他地方使用）
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dieapp'
};

export default {
  dbConfig
};

