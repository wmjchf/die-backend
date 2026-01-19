import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { get, all, run } from '../db/index.js';
import { logger } from '../utils/logger.js';
import { formatMySQLDateTime, getChinaTime, getChinaTodayStart, getChinaTodayEnd, parseMySQLDateTime } from '../utils/timezone.js';

const router = express.Router();

// 所有路由需要认证
router.use(authenticate);

// Check-in（确认"我还在"）
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 获取用户配置
    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.is_paused) {
      return res.status(400).json({ error: '服务已暂停，请先恢复服务' });
    }

    // 检查今天是否已经确认过（使用中国时区）
    // 使用 MySQL 的 DATE 函数直接比较日期部分，更可靠
    const chinaNow = getChinaTime();
    const todayDate = formatMySQLDateTime(chinaNow).split(' ')[0]; // 获取今天的日期部分 YYYY-MM-DD

    const todayCheckin = await get(
      `SELECT * FROM checkins 
       WHERE user_id = ? 
         AND DATE(check_in_time) = ?
       LIMIT 1`,
      [userId, todayDate]
    );

    if (todayCheckin) {
      return res.status(400).json({ error: '今天已经确认过了，明天再来吧' });
    }

    const checkInIntervalHours = user.check_in_interval_hours || 24;
    const now = getChinaTime(); // 使用中国时区时间
    const nextDeadline = new Date(now.getTime() + checkInIntervalHours * 60 * 60 * 1000);

    // 创建新的 check-in 记录
    const result = await run(
      `INSERT INTO checkins (user_id, check_in_time, next_check_in_deadline) 
       VALUES (?, ?, ?)`,
      [userId, formatMySQLDateTime(now), formatMySQLDateTime(nextDeadline)]
    );

    logger.info(`用户 ${userId} 完成 Check-in，下次截止时间: ${nextDeadline.toISOString()}`);

    // 返回最新的 check-in 记录
    const checkin = await get('SELECT * FROM checkins WHERE id = ?', [result.lastID]);

    res.status(201).json({
      message: '确认成功',
      checkin: {
        id: checkin.id,
        check_in_time: checkin.check_in_time,
        next_check_in_deadline: checkin.next_check_in_deadline
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取最新的 Check-in 记录
router.get('/latest', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const checkin = await get(
      `SELECT * FROM checkins 
       WHERE user_id = ? 
       ORDER BY check_in_time DESC 
       LIMIT 1`,
      [userId]
    );

    if (!checkin) {
      return res.json({
        checkin: null,
        message: '暂无确认记录'
      });
    }

    // 检查是否已过期（使用中国时区）
    const now = getChinaTime();
    const deadline = parseMySQLDateTime(checkin.next_check_in_deadline);
    const isOverdue = deadline ? now > deadline : false;

    res.json({
      checkin: {
        id: checkin.id,
        check_in_time: checkin.check_in_time,
        next_check_in_deadline: checkin.next_check_in_deadline,
        is_overdue: isOverdue
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取 Check-in 历史记录
router.get('/history', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const checkins = await all(
      `SELECT * FROM checkins 
       WHERE user_id = ? 
       ORDER BY check_in_time DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const totalResult = await get(
      'SELECT COUNT(*) as total FROM checkins WHERE user_id = ?',
      [userId]
    );
    const total = totalResult.total;

    res.json({
      checkins,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取统计信息
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 获取用户配置
    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);

    // 获取最新的 check-in 记录
    const latestCheckin = await get(
      `SELECT * FROM checkins 
       WHERE user_id = ? 
       ORDER BY check_in_time DESC 
       LIMIT 1`,
      [userId]
    );

    // 获取连续确认天数（简化实现，最近30天，使用中国时区）
    const chinaNowForDays = getChinaTime();
    const thirtyDaysAgo = new Date(chinaNowForDays.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoStr = formatMySQLDateTime(thirtyDaysAgo);
    
    const consecutiveDays = await get(
      `SELECT COUNT(DISTINCT DATE(check_in_time)) as days
       FROM checkins
       WHERE user_id = ?
         AND check_in_time >= ?`,
      [userId, thirtyDaysAgoStr]
    );

    // 检查今天是否已经确认过（使用中国时区）
    // 使用 MySQL 的 DATE 函数直接比较日期部分，更可靠
    const chinaNow = getChinaTime();
    const todayDate = formatMySQLDateTime(chinaNow).split(' ')[0]; // 获取今天的日期部分 YYYY-MM-DD

    const todayCheckin = await get(
      `SELECT * FROM checkins 
       WHERE user_id = ? 
         AND DATE(check_in_time) = ?
       LIMIT 1`,
      [userId, todayDate]
    );

    const todayChecked = !!todayCheckin;

    let status = 'normal';
    let nextDeadline = null;
    let isOverdue = false;

    if (latestCheckin) {
      nextDeadline = latestCheckin.next_check_in_deadline;
      const now = getChinaTime();
      const deadlineTime = parseMySQLDateTime(nextDeadline);
      
      if (deadlineTime) {
        isOverdue = now > deadlineTime;

        if (isOverdue) {
          status = 'overdue';
        } else {
          const hoursUntilDeadline = (deadlineTime - now) / (1000 * 60 * 60);
          if (hoursUntilDeadline <= (user.reminder_before_hours || 1)) {
            status = 'reminder';
          }
        }
      }
    } else {
      status = 'no_checkin';
    }

    res.json({
      status,
      is_paused: user.is_paused === 1,
      today_checked: todayChecked,
      consecutive_days: consecutiveDays.days || 0,
      latest_checkin: latestCheckin ? {
        check_in_time: latestCheckin.check_in_time,
        next_check_in_deadline: latestCheckin.next_check_in_deadline
      } : null,
      next_deadline: nextDeadline,
      is_overdue: isOverdue,
      check_in_interval_hours: user.check_in_interval_hours,
      grace_period_hours: user.grace_period_hours
    });
  } catch (error) {
    next(error);
  }
});

export default router;

