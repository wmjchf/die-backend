import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 尝试从多个路径加载 .env 文件
const envPaths = [
  path.resolve(__dirname, '.env'),           // backend/.env
  path.resolve(__dirname, '../.env'),         // 项目根目录/.env
  path.resolve(process.cwd(), '.env')        // 当前工作目录/.env
];

console.log('当前工作目录:', process.cwd());
console.log('脚本所在目录:', __dirname);
console.log('\n尝试加载 .env 文件...\n');

let loaded = false;

for (const envPath of envPaths) {
  console.log(`尝试路径: ${envPath}`);
  const result = dotenv.config({ path: envPath });
  
  if (!result.error) {
    console.log('✅ 成功加载!\n');
    loaded = true;
    break;
  } else {
    console.log(`❌ 失败: ${result.error.message}\n`);
  }
}

if (!loaded) {
  console.log('⚠️  所有路径都失败，尝试默认行为...');
  const result = dotenv.config();
  if (result.error) {
    console.log('❌ 默认路径也失败:', result.error.message);
  } else {
    console.log('✅ 从默认路径加载成功');
    loaded = true;
  }
}

console.log('\n=== 环境变量检查 ===');
console.log('DB_HOST:', process.env.DB_HOST || '(未设置)');
console.log('DB_PORT:', process.env.DB_PORT || '(未设置)');
console.log('DB_USER:', process.env.DB_USER || '(未设置)');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***已设置***' : '(未设置)');
console.log('DB_NAME:', process.env.DB_NAME || '(未设置)');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***已设置***' : '(未设置)');

if (!process.env.DB_PASSWORD) {
  console.log('\n⚠️  警告: DB_PASSWORD 未设置，MySQL 连接可能失败');
}

