import { logger } from '../utils/logger.js';
import { run } from '../db/index.js';
import Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import OpenApi from '@alicloud/openapi-client';
import Util from '@alicloud/tea-util';
import Credential from '@alicloud/credentials';

// 短信服务配置
const SMS_CONFIG = {
  accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || process.env.SMS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET || process.env.SMS_ACCESS_KEY_SECRET,
  signName: process.env.SMS_SIGN_NAME || '黄石市不方科技',
  templateCode: process.env.SMS_TEMPLATE_CODE || 'SMS_501290012'
};

// 创建阿里云短信客户端（单例）
let smsClient = null;

/**
 * 创建短信客户端
 * @returns {Dysmsapi20170525.default} 短信客户端实例
 */
function createSMSClient() {
  if (smsClient) {
    return smsClient;
  }

  // 使用 AccessKey 凭据
  const credentialsConfig = new Credential.Config({
    type: 'access_key',
    accessKeyId: SMS_CONFIG.accessKeyId,
    accessKeySecret: SMS_CONFIG.accessKeySecret
  });
  const credentialClient = new Credential.default(credentialsConfig);

  // 创建 OpenAPI 配置
  const config = new OpenApi.Config({
    credential: credentialClient
  });
  config.endpoint = 'dysmsapi.aliyuncs.com';

  smsClient = new Dysmsapi20170525.default(config);
  return smsClient;
}

/**
 * 发送短信
 * @param {string} phone - 接收短信的手机号
 * @param {string} userName - 用户名称
 * @param {string} userPhone - 用户的手机号
 * @returns {Promise<boolean>} 发送是否成功
 */
export async function sendSMS(phone, userName, userPhone) {
  try {
    // 检查配置
    if (!SMS_CONFIG.accessKeyId || !SMS_CONFIG.accessKeySecret) {
      logger.error('短信服务配置缺失: ALIBABA_CLOUD_ACCESS_KEY_ID 或 ALIBABA_CLOUD_ACCESS_KEY_SECRET 未设置');
      return false;
    }

    if (!SMS_CONFIG.templateCode) {
      logger.error('短信模板代码未设置: SMS_TEMPLATE_CODE');
      return false;
    }

    // 创建客户端
    const client = createSMSClient();

    // 构建请求参数
    // 注意：根据你的模板参数，这里使用 code 和 name
    // 如果你的模板参数不同，需要相应调整
    const sendSmsRequest = new Dysmsapi20170525.SendSmsRequest({
      signName: SMS_CONFIG.signName,
      templateCode: SMS_CONFIG.templateCode,
      phoneNumbers: phone,
      // 根据你的模板参数格式调整
      // 如果模板参数是 {"code":"xxx","name":"xxx"}，使用下面的格式
      templateParam: JSON.stringify({
        code: userPhone.substring(userPhone.length - 4) || '0000', // 取手机号后4位作为验证码
        name: userName || userPhone
      })
    });

    const runtime = new Util.RuntimeOptions({});

    // 发送短信
    const resp = await client.sendSmsWithOptions(sendSmsRequest, runtime);

    // 检查响应
    if (resp.body.code === 'OK') {
      logger.info(`短信发送成功: ${phone}, 请求ID: ${resp.body.requestId}`);
      return true;
    } else {
      const errorMsg = `短信发送失败: ${phone}, 错误码: ${resp.body.code}, 错误信息: ${resp.body.message || '未知错误'}`;
      logger.error(errorMsg);
      return false;
    }
  } catch (error) {
    let errorMessage = '发送短信异常';
    
    if (error.message) {
      errorMessage = error.message;
    }
    
    if (error.data) {
      if (error.data.Recommend) {
        logger.error('诊断地址:', error.data.Recommend);
      }
      if (error.data.message) {
        errorMessage = error.data.message;
      }
    }
    
    logger.error('发送短信异常:', errorMessage, error);
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

