# 阿里云短信服务配置指南

## 一、安装依赖

```bash
cd backend
npm install
```

或使用 pnpm：

```bash
cd backend
pnpm install
```

安装的依赖包：
- `@alicloud/dysmsapi20170525` - 阿里云短信服务 SDK
- `@alicloud/openapi-client` - 阿里云 OpenAPI 客户端
- `@alicloud/tea-util` - 工具类
- `@alicloud/credentials` - 凭据管理
- `@alicloud/tea-typescript` - TypeScript 类型支持

## 二、配置环境变量

在 `.env` 文件中添加以下配置：

```bash
# 阿里云 AccessKey（推荐使用 ALIBABA_CLOUD_ 前缀）
ALIBABA_CLOUD_ACCESS_KEY_ID=your-access-key-id
ALIBABA_CLOUD_ACCESS_KEY_SECRET=your-access-key-secret

# 短信签名（已在阿里云短信服务中审核通过的签名）
SMS_SIGN_NAME=黄石市不方科技

# 短信模板代码（已在阿里云短信服务中审核通过的模板）
SMS_TEMPLATE_CODE=SMS_501290012
```

### 获取 AccessKey

1. 登录 [阿里云控制台](https://home.console.aliyun.com/)
2. 进入 [访问控制（RAM）](https://ram.console.aliyun.com/)
3. 创建用户或使用现有用户
4. 创建 AccessKey（建议创建子账号，并授予短信服务权限）
5. 复制 `AccessKey ID` 和 `AccessKey Secret`

### 短信签名和模板

1. 登录 [阿里云短信服务控制台](https://dysms.console.aliyun.com/)
2. 在 **国内消息** → **签名管理** 中创建或查看签名
3. 在 **国内消息** → **模板管理** 中创建或查看模板

**注意：** 签名和模板需要审核通过后才能使用。

## 三、模板参数说明

当前代码使用的模板参数格式：

```json
{
  "code": "手机号后4位",
  "name": "用户昵称或手机号"
}
```

如果你的短信模板参数不同，需要修改 `src/services/smsService.js` 中的 `templateParam` 部分。

### 常见模板参数格式

**格式1：用户信息**
```json
{
  "name": "用户昵称",
  "phone": "用户手机号"
}
```

**格式2：验证码**
```json
{
  "code": "验证码",
  "name": "用户名称"
}
```

**格式3：自定义参数**
```json
{
  "userName": "用户昵称",
  "userPhone": "用户手机号",
  "deadline": "截止时间"
}
```

根据你的模板参数，修改 `smsService.js` 中的第 78-81 行：

```javascript
templateParam: JSON.stringify({
  // 根据你的模板参数调整这里的字段名和值
  code: userPhone.substring(userPhone.length - 4) || '0000',
  name: userName || userPhone
})
```

## 四、测试短信发送

### 方法1：通过定时任务测试

1. 确保用户已超过确认时间且已过宽限期
2. 确保用户已设置紧急联系人
3. 等待定时任务触发（每 5 分钟检查一次）
4. 查看日志：

```bash
pm2 logs dieapp-backend
```

### 方法2：创建测试脚本

创建 `test-sms.js`：

```javascript
import '../src/config/env.js';
import { sendSMS } from './src/services/smsService.js';

async function test() {
  const result = await sendSMS(
    '15868843247',  // 接收短信的手机号
    '测试用户',      // 用户名称
    '13800138000'   // 用户手机号
  );
  
  console.log('发送结果:', result ? '成功' : '失败');
  process.exit(result ? 0 : 1);
}

test();
```

运行测试：

```bash
node test-sms.js
```

## 五、错误排查

### 1. 配置错误

**错误信息：** `短信服务配置缺失`

**解决方法：** 检查 `.env` 文件中的 `ALIBABA_CLOUD_ACCESS_KEY_ID` 和 `ALIBABA_CLOUD_ACCESS_KEY_SECRET` 是否正确设置。

### 2. 签名或模板未审核

**错误信息：** `InvalidSignName` 或 `InvalidTemplateCode`

**解决方法：** 
- 检查签名和模板是否已在阿里云控制台审核通过
- 检查 `SMS_SIGN_NAME` 和 `SMS_TEMPLATE_CODE` 是否与阿里云控制台中的完全一致

### 3. AccessKey 权限不足

**错误信息：** `Forbidden` 或 `AccessDenied`

**解决方法：**
- 检查 AccessKey 是否有短信服务权限
- 在 RAM 控制台中为子账号添加 `AliyunDysmsFullAccess` 权限

### 4. 模板参数不匹配

**错误信息：** `InvalidTemplateParam`

**解决方法：**
- 检查模板参数格式是否正确（必须是 JSON 字符串）
- 检查模板参数中的字段名是否与模板中定义的变量名一致
- 检查参数值是否为空或格式不正确

### 5. 余额不足

**错误信息：** `InsufficientBalance`

**解决方法：** 在阿里云控制台充值短信服务余额

## 六、查看发送日志

### 1. 应用日志

```bash
# 查看实时日志
pm2 logs dieapp-backend

# 查看最近 100 行日志
pm2 logs dieapp-backend --lines 100
```

### 2. 数据库日志

查询 `sms_logs` 表：

```sql
SELECT * FROM sms_logs 
ORDER BY sent_at DESC 
LIMIT 20;
```

### 3. 阿里云控制台

在 [阿里云短信服务控制台](https://dysms.console.aliyun.com/) → **统计报表** 中查看发送记录。

## 七、安全建议

1. **使用子账号 AccessKey**
   - 不要使用主账号的 AccessKey
   - 创建子账号并授予最小权限（仅短信服务权限）

2. **保护 AccessKey**
   - 不要将 `.env` 文件提交到 Git
   - 在生产环境中使用环境变量或密钥管理服务

3. **监控短信发送**
   - 定期检查短信发送日志
   - 设置异常告警（如发送失败率过高）

4. **限制发送频率**
   - 当前已实现：每天最多 3 条，间隔 30 分钟
   - 可根据需要调整 `MAX_SMS_COUNT` 和 `SMS_INTERVAL_MINUTES`

## 八、费用说明

- 阿里云短信服务按条计费
- 具体价格请查看 [阿里云短信服务价格](https://www.aliyun.com/price/product#/sms/detail)
- 建议设置预算告警，避免意外费用
