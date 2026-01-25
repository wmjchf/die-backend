import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { body, validationResult } from 'express-validator';
import { get, run } from '../db/index.js';
import { isValidPhone } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 注册
router.post('/register', [
  body('phone').custom((value) => {
    if (!isValidPhone(value)) {
      throw new Error('手机号格式不正确');
    }
    return true;
  }),
  body('password').isLength({ min: 6 }).withMessage('密码至少 6 位'),
  body('nickname').optional().isString()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: '验证失败', details: errors.array() });
    }

    const { phone, password, nickname } = req.body;

    // 检查用户是否已存在
    const existingUser = await get('SELECT * FROM users WHERE phone = ?', [phone]);
    if (existingUser) {
      return res.status(400).json({ error: '该手机号已注册' });
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 自动识别时区（简化处理，实际可以从请求头获取）
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';

    // 创建用户
    const result = await run(
      `INSERT INTO users (phone, nickname, password_hash, timezone) 
       VALUES (?, ?, ?, ?)`,
      [phone, nickname || null, passwordHash, timezone]
    );

    // 生成 JWT token
    const token = jwt.sign(
      { userId: result.lastID, phone },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    logger.info(`新用户注册: ${phone} (ID: ${result.lastID})`);

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: result.lastID,
        phone,
        nickname,
        is_paused: 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// 登录
router.post('/login', [
  body('phone').custom((value) => {
    if (!isValidPhone(value)) {
      throw new Error('手机号格式不正确');
    }
    return true;
  }),
  body('password').notEmpty().withMessage('密码不能为空')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: '验证失败', details: errors.array() });
    }

    const { phone, password } = req.body;

    // 查找用户
    const user = await get('SELECT * FROM users WHERE phone = ?', [phone]);
    if (!user) {
      return res.status(401).json({ error: '手机号或密码错误' });
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: '手机号或密码错误' });
    }

    // 生成 JWT token
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    logger.info(`用户登录: ${phone} (ID: ${user.id})`);

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        is_paused: user.is_paused === 1
      }
    });
  } catch (error) {
    next(error);
  }
});

// 微信登录
router.post('/wechat-login', [
  body('code').notEmpty().withMessage('微信 code 不能为空')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: '验证失败', details: errors.array() });
    }

    const { code } = req.body;
    const WX_APPID = process.env.WX_APPID;
    const WX_SECRET = process.env.WX_SECRET;

    // 检查微信配置
    if (!WX_APPID || !WX_SECRET) {
      logger.error('微信登录配置缺失: WX_APPID 或 WX_SECRET 未设置');
      return res.status(500).json({ 
        error: '服务器配置错误', 
        message: '微信登录功能未配置，请联系管理员' 
      });
    }

    // 调用微信 API 获取 openid 和 session_key
    // 参考文档: https://developers.weixin.qq.com/miniprogram/dev/server/API/user-login/api_code2session.html
    let wxResponse;
    try {
      wxResponse = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
        params: {
          appid: WX_APPID,
          secret: WX_SECRET,
          js_code: code,
          grant_type: 'authorization_code'
        },
        timeout: 10000 // 10秒超时
      });
    } catch (error) {
      logger.error('调用微信 API 失败:', error.message);
      return res.status(500).json({ 
        error: '微信登录失败', 
        message: '无法连接到微信服务器，请稍后重试' 
      });
    }

    // 检查微信 API 返回的错误
    if (wxResponse.data.errcode) {
      const errorMsg = wxResponse.data.errmsg || '未知错误';
      logger.error(`微信登录失败 (errcode: ${wxResponse.data.errcode}): ${errorMsg}`);
      
      // 根据错误码返回友好的错误信息
      let userMessage = '微信登录失败';
      switch (wxResponse.data.errcode) {
        case 40029:
          userMessage = '登录凭证已过期，请重新登录';
          break;
        case 40226:
          userMessage = '账号存在安全风险，无法登录';
          break;
        case 45011:
          userMessage = '请求过于频繁，请稍后再试';
          break;
        case -1:
          userMessage = '微信服务繁忙，请稍后再试';
          break;
      }
      
      return res.status(400).json({ 
        error: '微信登录失败', 
        message: userMessage,
        errcode: wxResponse.data.errcode
      });
    }

    const { openid, session_key, unionid } = wxResponse.data;

    if (!openid) {
      logger.error('微信 API 返回数据异常: 缺少 openid');
      return res.status(500).json({ 
        error: '微信登录失败', 
        message: '获取用户信息失败' 
      });
    }

    // 使用 openid 作为用户唯一标识（存储在 phone 字段）
    // 注意：openid 通常是 28 个字符，VARCHAR(100) 足够
    let user = await get('SELECT * FROM users WHERE phone = ?', [openid]);
    
    if (!user) {
      // 新用户，自动注册
      const passwordHash = await bcrypt.hash(openid + session_key, 10); // 使用 openid + session_key 作为密码
      const timezone = 'Asia/Shanghai';
      
      const result = await run(
        `INSERT INTO users (phone, password_hash, nickname, timezone) 
         VALUES (?, ?, ?, ?)`,
        [openid, passwordHash, null, timezone]
      );

      user = await get('SELECT * FROM users WHERE id = ?', [result.lastID]);
      logger.info(`新用户注册（微信）: openid=${openid.substring(0, 8)}... (ID: ${result.lastID})`);
    } else {
      logger.info(`用户登录（微信）: openid=${openid.substring(0, 8)}... (ID: ${user.id})`);
    }

    // 生成 JWT token
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, openid },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        is_paused: user.is_paused === 1
      }
    });
  } catch (error) {
    logger.error('微信登录处理异常:', error);
    next(error);
  }
});

export default router;

