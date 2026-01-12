import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { get } from '../db/index.js';

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

export default router;

