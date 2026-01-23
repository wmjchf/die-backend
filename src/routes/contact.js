import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { get, all, run } from '../db/index.js';
import { isValidPhone } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// 所有路由需要认证
router.use(authenticate);

// 获取所有联系人
router.get('/', async (req, res, next) => {
  try {
    const contacts = await all(
      `SELECT 
        id,
        user_id,
        name,
        phone,
        is_primary,
        UNIX_TIMESTAMP(created_at) * 1000 as created_at,
        UNIX_TIMESTAMP(updated_at) * 1000 as updated_at
      FROM contacts WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC`,
      [req.user.id]
    );

    res.json({ contacts });
  } catch (error) {
    next(error);
  }
});

// 添加联系人
router.post('/', [
  body('name').notEmpty().withMessage('联系人姓名不能为空'),
  body('phone').custom((value) => {
    if (!isValidPhone(value)) {
      throw new Error('手机号格式不正确');
    }
    return true;
  }),
  body('is_primary').optional().isBoolean()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: '验证失败', details: errors.array() });
    }

    const { name, phone, is_primary } = req.body;

    // 检查是否已存在相同手机号
    const existing = await get(
      'SELECT * FROM contacts WHERE user_id = ? AND phone = ?',
      [req.user.id, phone]
    );

    if (existing) {
      return res.status(400).json({ error: '该联系人已存在' });
    }

    // 如果设置为主要联系人，先取消其他主要联系人
    if (is_primary) {
      await run(
        'UPDATE contacts SET is_primary = 0 WHERE user_id = ?',
        [req.user.id]
      );
    }

    const result = await run(
      `INSERT INTO contacts (user_id, name, phone, is_primary) 
       VALUES (?, ?, ?, ?)`,
      [req.user.id, name, phone, is_primary ? 1 : 0]
    );

    logger.info(`用户 ${req.user.id} 添加了联系人: ${name} (${phone})`);

    const contact = await get(
      `SELECT 
        id,
        user_id,
        name,
        phone,
        is_primary,
        UNIX_TIMESTAMP(created_at) * 1000 as created_at,
        UNIX_TIMESTAMP(updated_at) * 1000 as updated_at
      FROM contacts WHERE id = ?`,
      [result.lastID]
    );

    res.status(201).json({
      message: '添加成功',
      contact
    });
  } catch (error) {
    next(error);
  }
});

// 更新联系人
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('联系人姓名不能为空'),
  body('phone').optional().custom((value) => {
    if (value && !isValidPhone(value)) {
      throw new Error('手机号格式不正确');
    }
    return true;
  }),
  body('is_primary').optional().isBoolean()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: '验证失败', details: errors.array() });
    }

    const contactId = parseInt(req.params.id);
    const { name, phone, is_primary } = req.body;

    // 检查联系人是否存在且属于当前用户
    const contact = await get(
      'SELECT * FROM contacts WHERE id = ? AND user_id = ?',
      [contactId, req.user.id]
    );

    if (!contact) {
      return res.status(404).json({ error: '联系人不存在' });
    }

    // 如果更新手机号，检查是否与其他联系人冲突
    if (phone && phone !== contact.phone) {
      const existing = await get(
        'SELECT * FROM contacts WHERE user_id = ? AND phone = ? AND id != ?',
        [req.user.id, phone, contactId]
      );

      if (existing) {
        return res.status(400).json({ error: '该手机号已被其他联系人使用' });
      }
    }

    // 如果设置为主要联系人，先取消其他主要联系人
    if (is_primary) {
      await run(
        'UPDATE contacts SET is_primary = 0 WHERE user_id = ? AND id != ?',
        [req.user.id, contactId]
      );
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (is_primary !== undefined) {
      updates.push('is_primary = ?');
      params.push(is_primary ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(contactId, req.user.id);

    await run(
      `UPDATE contacts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    logger.info(`用户 ${req.user.id} 更新了联系人 ${contactId}`);

    const updatedContact = await get(
      `SELECT 
        id,
        user_id,
        name,
        phone,
        is_primary,
        UNIX_TIMESTAMP(created_at) * 1000 as created_at,
        UNIX_TIMESTAMP(updated_at) * 1000 as updated_at
      FROM contacts WHERE id = ?`,
      [contactId]
    );

    res.json({
      message: '更新成功',
      contact: updatedContact
    });
  } catch (error) {
    next(error);
  }
});

// 删除联系人
router.delete('/:id', async (req, res, next) => {
  try {
    const contactId = parseInt(req.params.id);

    // 检查联系人是否存在且属于当前用户
    const contact = await get(
      'SELECT * FROM contacts WHERE id = ? AND user_id = ?',
      [contactId, req.user.id]
    );

    if (!contact) {
      return res.status(404).json({ error: '联系人不存在' });
    }

    await run(
      'DELETE FROM contacts WHERE id = ? AND user_id = ?',
      [contactId, req.user.id]
    );

    logger.info(`用户 ${req.user.id} 删除了联系人 ${contactId}`);

    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

export default router;

