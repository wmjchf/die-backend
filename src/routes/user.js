import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { get, run } from '../db/index.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// 所有路由需要认证
router.use(authenticate);

// 获取当前用户信息（只返回必要字段）
router.get('/me', async (req, res, next) => {
  try {
    const user = await get('SELECT id, phone, nickname, is_paused FROM users WHERE id = ?', [req.user.id]);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ 
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

// 更新用户信息
router.put('/me', [
  body('nickname').optional().notEmpty().withMessage('昵称不能为空').isLength({ max: 100 }).withMessage('昵称长度不能超过100个字符')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: '验证失败', details: errors.array() });
    }

    const { nickname } = req.body;

    if (nickname === undefined) {
      return res.status(400).json({ error: '没有要更新的字段' });
    }

    await run(
      'UPDATE users SET nickname = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nickname.trim() || null, req.user.id]
    );

    logger.info(`用户 ${req.user.id} 更新了昵称: ${nickname}`);

    const updatedUser = await get('SELECT id, phone, nickname, is_paused FROM users WHERE id = ?', [req.user.id]);

    res.json({
      message: '更新成功',
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        nickname: updatedUser.nickname,
        is_paused: updatedUser.is_paused === 1
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

