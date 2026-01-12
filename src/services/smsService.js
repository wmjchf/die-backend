import { logger } from '../utils/logger.js';
import { run } from '../db/index.js';

// 短信服务配置
const SMS_CONFIG = {
  accessKeyId: process.env.SMS_ACCESS_KEY_ID,
  accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET,
  signName: process.env.SMS_SIGN_NAME || '还在吗',
  templateCode: process.env.SMS_TEMPLATE_CODE
};

/**
 * 发送短信（当前为模拟实现，实际使用时需要集成真实的短信服务）
 * @param {string} phone - 接收短信的手机号
 * @param {string} userName - 用户名称
 * @param {string} userPhone - 用户的手机号
 * @returns {Promise<boolean>} 发送是否成功
 */
export async function sendSMS(phone, userName, userPhone) {
  try {
    // TODO: 集成真实的短信服务（如阿里云、腾讯云等）
    // 这里使用模拟实现
    
    const message = `【${SMS_CONFIG.signName}】${userName || userPhone} 已超过确认时间未响应，请尽快联系确认安全。如有紧急情况，请及时处理。`;
    
    logger.info(`[模拟] 发送短信到 ${phone}: ${message}`);
    
    // 模拟发送延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 实际集成示例（阿里云短信）：
    /*
    const Core = require('@alicloud/pop-core');
    const client = new Core({
      accessKeyId: SMS_CONFIG.accessKeyId,
      accessKeySecret: SMS_CONFIG.accessKeySecret,
      endpoint: 'https://dysmsapi.aliyuncs.com',
      apiVersion: '2017-05-25'
    });
    
    const params = {
      PhoneNumbers: phone,
      SignName: SMS_CONFIG.signName,
      TemplateCode: SMS_CONFIG.templateCode,
      TemplateParam: JSON.stringify({
        userName: userName || userPhone,
        userPhone: userPhone
      })
    };
    
    const result = await client.request('SendSms', params, {
      method: 'POST'
    });
    
    return result.Code === 'OK';
    */
    
    return true;
  } catch (error) {
    logger.error('发送短信失败:', error);
    return false;
  }
}

/**
 * 记录短信发送日志
 */
export async function logSMS(userId, contactId, smsCount, status, errorMessage = null) {
  try {
    await run(
      `INSERT INTO sms_logs (user_id, contact_id, sms_count, status, error_message) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, contactId, smsCount, status, errorMessage]
    );
  } catch (error) {
    logger.error('记录短信日志失败:', error);
  }
}

