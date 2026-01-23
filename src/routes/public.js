import express from 'express';
import { all, get } from '../db/index.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * 获取用户列表（公开接口，无需认证）
 * GET /api/public/users
 * 
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20，最大100）
 */
router.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // 获取用户列表（只返回必要字段，隐藏敏感信息）
    // 注意：MySQL 预处理语句对 LIMIT 参数支持有限，使用字符串拼接（已验证为数字，安全）
    const users = await all(
      `SELECT 
        id,
        phone,
        nickname,
        is_paused,
        UNIX_TIMESTAMP(created_at) * 1000 as created_at,
        UNIX_TIMESTAMP(updated_at) * 1000 as updated_at
      FROM users 
      ORDER BY created_at DESC 
      LIMIT ${offset}, ${limit}`,
      []
    );

    // 获取总数
    const totalResult = await get('SELECT COUNT(*) as total FROM users');
    const total = totalResult.total;

    // 隐藏手机号中间部分（保护隐私）
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      phone: user.phone ? `${user.phone.substring(0, 3)}****${user.phone.substring(7)}` : null,
      nickname: user.nickname,
      is_paused: user.is_paused === 1,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));

    res.json({
      users: sanitizedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('获取用户列表失败:', error);
    next(error);
  }
});

/**
 * 获取签到记录列表（公开接口，无需认证）
 * GET /api/public/checkins
 * 
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20，最大100）
 * - user_id: 可选，筛选特定用户的签到记录
 */
router.get('/checkins', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const userId = req.query.user_id ? parseInt(req.query.user_id) : null;

    let checkins;
    let totalResult;

    if (userId) {
      // 获取特定用户的签到记录
      // 注意：MySQL 预处理语句对 LIMIT 参数支持有限，使用字符串拼接（已验证为数字，安全）
      checkins = await all(
        `SELECT 
          c.id,
          c.user_id,
          u.phone,
          u.nickname,
          UNIX_TIMESTAMP(c.check_in_time) * 1000 as check_in_time,
          UNIX_TIMESTAMP(c.next_check_in_deadline) * 1000 as next_check_in_deadline
        FROM checkins c
        INNER JOIN users u ON c.user_id = u.id
        WHERE c.user_id = ?
        ORDER BY c.check_in_time DESC 
        LIMIT ${offset}, ${limit}`,
        [userId]
      );

      totalResult = await get(
        'SELECT COUNT(*) as total FROM checkins WHERE user_id = ?',
        [userId]
      );
    } else {
      // 获取所有签到记录
      // 注意：MySQL 预处理语句对 LIMIT 参数支持有限，使用字符串拼接（已验证为数字，安全）
      checkins = await all(
        `SELECT 
          c.id,
          c.user_id,
          u.phone,
          u.nickname,
          UNIX_TIMESTAMP(c.check_in_time) * 1000 as check_in_time,
          UNIX_TIMESTAMP(c.next_check_in_deadline) * 1000 as next_check_in_deadline
        FROM checkins c
        INNER JOIN users u ON c.user_id = u.id
        ORDER BY c.check_in_time DESC 
        LIMIT ${offset}, ${limit}`,
        []
      );

      totalResult = await get('SELECT COUNT(*) as total FROM checkins');
    }

    const total = totalResult.total;

    // 隐藏手机号中间部分（保护隐私）
    const sanitizedCheckins = checkins.map(checkin => ({
      id: checkin.id,
      user_id: checkin.user_id,
      user: {
        phone: checkin.phone ? `${checkin.phone.substring(0, 3)}****${checkin.phone.substring(7)}` : null,
        nickname: checkin.nickname
      },
      check_in_time: checkin.check_in_time,
      next_check_in_deadline: checkin.next_check_in_deadline
    }));

    res.json({
      checkins: sanitizedCheckins,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('获取签到记录失败:', error);
    next(error);
  }
});

export default router;

