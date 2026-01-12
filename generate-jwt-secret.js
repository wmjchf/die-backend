#!/usr/bin/env node
// 生成 JWT_SECRET 的工具脚本

import crypto from 'crypto';

// 生成 64 字节（128 个十六进制字符）的随机密钥
const secret = crypto.randomBytes(64).toString('hex');

console.log('='.repeat(80));
console.log('生成的 JWT_SECRET:');
console.log('='.repeat(80));
console.log(secret);
console.log('='.repeat(80));
console.log('\n请将此密钥添加到 .env 文件中:');
console.log(`JWT_SECRET=${secret}`);
console.log('\n⚠️  重要提示:');
console.log('1. 请妥善保管此密钥，不要泄露');
console.log('2. 生产环境应使用不同的密钥');
console.log('3. 不要将密钥提交到版本控制系统');
console.log('='.repeat(80));

