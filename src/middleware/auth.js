import jwt from 'jsonwebtoken';
import { get } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await get('SELECT * FROM users WHERE id = ?', [decoded.userId]);
      
      if (!user) {
        return res.status(401).json({ error: '用户不存在' });
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: '令牌已过期' });
      }
      return res.status(401).json({ error: '无效的认证令牌' });
    }
  } catch (error) {
    next(error);
  }
}

