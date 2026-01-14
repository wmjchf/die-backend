import './src/config/env.js';
import { sendSMS } from './src/services/smsService.js';
import { logger } from './src/utils/logger.js';

/**
 * 测试短信发送功能
 * 使用方法: node test-sms.js <接收手机号> [用户名称] [用户手机号]
 * 
 * 示例:
 * node test-sms.js 15868843247
 * node test-sms.js 15868843247 "测试用户" "13800138000"
 */
async function testSMS() {
  // 从命令行参数获取
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('使用方法: node test-sms.js <接收手机号> [用户名称] [用户手机号]');
    console.log('示例: node test-sms.js 15868843247 "测试用户" "13800138000"');
    process.exit(1);
  }

  const phone = args[0]; // 接收短信的手机号
  const userName = args[1] || '测试用户'; // 用户名称，默认为"测试用户"
  const userPhone = args[2] || phone; // 用户手机号，默认为接收手机号

  console.log('\n========== 短信发送测试 ==========');
  console.log(`接收手机号: ${phone}`);
  console.log(`用户名称: ${userName}`);
  console.log(`用户手机号: ${userPhone}`);
  console.log('====================================\n');

  try {
    console.log('正在发送短信...');
    const result = await sendSMS(phone, userName, userPhone);
    
    if (result) {
      console.log('✅ 短信发送成功！');
      console.log(`请检查手机 ${phone} 是否收到短信。\n`);
      process.exit(0);
    } else {
      console.log('❌ 短信发送失败！');
      console.log('请查看上面的错误信息，或检查日志文件。\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 测试过程中发生异常:', error);
    logger.error('测试短信发送异常:', error);
    process.exit(1);
  }
}

testSMS();
