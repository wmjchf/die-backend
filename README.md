# Alive Ping 后端 API

基于 Express 的后端 API 服务，提供用户认证、联系人管理、Check-in 确认和短信提醒功能。

## 功能特性

- ✅ 用户注册/登录（手机号 + 密码）
- ✅ JWT 认证
- ✅ 用户信息管理
- ✅ 紧急联系人管理
- ✅ Check-in 确认功能
- ✅ 定时任务（自动检查超时并发送短信）
- ✅ 短信服务（当前为模拟实现，可集成真实服务）

## 技术栈

- **Node.js** + **Express**
- **MySQL** 数据库
- **JWT** 认证
- **bcryptjs** 密码加密
- **node-cron** 定时任务
- **express-validator** 数据验证

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置 MySQL 数据库

确保已安装并运行 MySQL 服务，然后创建数据库：

```sql
CREATE DATABASE dieapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. 配置环境变量

复制 `env.example` 为 `.env` 并修改配置：

```bash
cp env.example .env
```

编辑 `.env` 文件，设置必要的配置项：
- `JWT_SECRET`: JWT 密钥（必须修改）
- `DB_HOST`: MySQL 主机地址（默认 localhost）
- `DB_PORT`: MySQL 端口（默认 3306）
- `DB_USER`: MySQL 用户名（默认 root）
- `DB_PASSWORD`: MySQL 密码
- `DB_NAME`: 数据库名称（默认 dieapp）

### 4. 启动服务

开发模式（自动重启）：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

服务默认运行在 `http://localhost:3000`

## API 文档

### 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: Bearer Token（JWT）

### 认证接口

#### 注册
```
POST /api/auth/register
Body: {
  "phone": "13800138000",
  "password": "123456",
  "nickname": "张三" // 可选
}
```

#### 登录
```
POST /api/auth/login
Body: {
  "phone": "13800138000",
  "password": "123456"
}
```

### 用户接口（需要认证）

#### 获取当前用户信息
```
GET /api/user/me
Headers: Authorization: Bearer <token>
```

#### 更新用户信息
```
PUT /api/user/me
Headers: Authorization: Bearer <token>
Body: {
  "nickname": "新昵称", // 可选
  "timezone": "Asia/Shanghai", // 可选
  "check_in_interval_hours": 24, // 可选，1-168
  "grace_period_hours": 2, // 可选，0-24
  "reminder_before_hours": 1, // 可选，0-24
  "is_paused": false // 可选，暂停服务
}
```

### 联系人接口（需要认证）

#### 获取所有联系人
```
GET /api/contacts
Headers: Authorization: Bearer <token>
```

#### 添加联系人
```
POST /api/contacts
Headers: Authorization: Bearer <token>
Body: {
  "name": "紧急联系人",
  "phone": "13900139000",
  "is_primary": true // 可选，是否为主要联系人
}
```

#### 更新联系人
```
PUT /api/contacts/:id
Headers: Authorization: Bearer <token>
Body: {
  "name": "新名称", // 可选
  "phone": "13900139000", // 可选
  "is_primary": true // 可选
}
```

#### 删除联系人
```
DELETE /api/contacts/:id
Headers: Authorization: Bearer <token>
```

### Check-in 接口（需要认证）

#### 确认"我还在"
```
POST /api/checkin
Headers: Authorization: Bearer <token>
```

#### 获取最新确认记录
```
GET /api/checkin/latest
Headers: Authorization: Bearer <token>
```

#### 获取确认历史
```
GET /api/checkin/history?page=1&limit=20
Headers: Authorization: Bearer <token>
```

#### 获取统计信息
```
GET /api/checkin/stats
Headers: Authorization: Bearer <token>
```

返回示例：
```json
{
  "status": "normal", // normal | overdue | reminder | no_checkin
  "is_paused": false,
  "total_checkins": 10,
  "consecutive_days": 5,
  "latest_checkin": {
    "check_in_time": "2026-01-11T10:00:00.000Z",
    "next_check_in_deadline": "2026-01-12T10:00:00.000Z"
  },
  "next_deadline": "2026-01-12T10:00:00.000Z",
  "is_overdue": false,
  "check_in_interval_hours": 24,
  "grace_period_hours": 2
}
```

## 数据库结构

系统会在首次启动时自动创建所有必要的表。数据库使用 **MySQL**，字符集为 `utf8mb4`。

### users 表
- id: 用户ID
- phone: 手机号（唯一）
- nickname: 昵称
- timezone: 时区
- check_in_interval_hours: 确认周期（小时）
- grace_period_hours: 宽限期（小时）
- reminder_before_hours: 提前提醒时间（小时）
- is_paused: 是否暂停服务
- password_hash: 密码哈希
- created_at, updated_at: 时间戳

### contacts 表
- id: 联系人ID
- user_id: 用户ID
- name: 联系人姓名
- phone: 联系人手机号
- is_primary: 是否为主要联系人
- created_at, updated_at: 时间戳

### checkins 表
- id: 记录ID
- user_id: 用户ID
- check_in_time: 确认时间
- next_check_in_deadline: 下次确认截止时间

### sms_logs 表
- id: 记录ID
- user_id: 用户ID
- contact_id: 联系人ID
- sms_count: 短信序号
- sent_at: 发送时间
- status: 发送状态
- error_message: 错误信息

## 定时任务

系统会自动运行以下定时任务：

1. **检查超时用户**（每 5 分钟）
   - 查找超过确认截止时间且已过宽限期的用户
   - 自动发送短信给紧急联系人
   - 遵循短信发送规则（最多 3 条，间隔 30 分钟）

2. **发送提醒通知**（每 10 分钟）
   - 查找即将到期的用户（提前 1 小时）
   - 发送提醒通知（当前为日志记录，可扩展为推送通知）

## 短信服务集成

当前短信服务为模拟实现。要集成真实的短信服务，请修改 `src/services/smsService.js`：

### 阿里云短信服务示例

```javascript
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
```

## 开发建议

1. **生产环境配置**
   - 修改 `JWT_SECRET` 为强随机字符串
   - 配置真实的短信服务
   - 配置 MySQL 连接池参数（根据服务器性能调整）
   - 启用数据库连接池监控
   - 定期备份数据库

2. **安全建议**
   - 使用 HTTPS
   - 实现请求频率限制
   - 添加输入验证和 SQL 注入防护
   - 定期更新依赖包

3. **扩展功能**
   - 实现推送通知（替代或补充短信）
   - 添加数据统计和分析
   - 实现多设备登录管理
   - 添加操作日志

## 许可证

ISC

