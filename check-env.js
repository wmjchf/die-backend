// 检查环境变量的简单脚本
// 这个脚本会显示当前已加载的环境变量

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 尝试加载 .env 文件
const envPath = path.resolve(__dirname, '.env');
console.log(`尝试加载 .env 文件: ${envPath}\n`);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.log(`⚠️  无法加载 .env 文件: ${result.error.message}`);
  console.log('尝试使用默认路径...\n');
  dotenv.config(); // 尝试默认路径
} else {
  console.log('✅ .env 文件加载成功！\n');
}

console.log('=== 环境变量检查 ===\n');

const envVars = {
  'DB_HOST': process.env.DB_HOST,
  'DB_PORT': process.env.DB_PORT,
  'DB_USER': process.env.DB_USER,
  'DB_PASSWORD': process.env.DB_PASSWORD,
  'DB_NAME': process.env.DB_NAME,
  'JWT_SECRET': process.env.JWT_SECRET,
  'PORT': process.env.PORT,
  'NODE_ENV': process.env.NODE_ENV
};

let hasMissing = false;

for (const [key, value] of Object.entries(envVars)) {
  if (value) {
    if (key.includes('PASSWORD') || key.includes('SECRET')) {
      console.log(`✅ ${key}: ***已设置*** (长度: ${value.length})`);
    } else {
      console.log(`✅ ${key}: ${value}`);
    }
  } else {
    console.log(`❌ ${key}: (未设置)`);
    if (key.startsWith('DB_') || key === 'JWT_SECRET') {
      hasMissing = true;
    }
  }
}

console.log('\n=== 检查结果 ===');

if (hasMissing) {
  console.log('⚠️  缺少必要的环境变量！');
  console.log('\n请确保：');
  console.log('1. .env 文件存在于 backend 目录下');
  console.log('2. .env 文件格式正确（每行 KEY=VALUE）');
  console.log('3. 从 backend 目录运行应用（npm run dev）');
  console.log('\n.env 文件示例：');
  console.log('DB_HOST=localhost');
  console.log('DB_PORT=3306');
  console.log('DB_USER=root');
  console.log('DB_PASSWORD=你的密码');
  console.log('DB_NAME=dieapp');
  console.log('JWT_SECRET=your-secret-key');
} else {
  console.log('✅ 所有必要的环境变量都已设置！');
}

console.log('\n提示：如果环境变量未加载，请检查：');
console.log('- .env 文件是否在 backend 目录下');
console.log('- 是否从 backend 目录运行应用');
console.log('- .env 文件格式是否正确');

