# 后端部署指南

## 一、服务器环境准备

### 1. 安装 Node.js
```bash
# 使用 nvm 安装 Node.js（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 或直接安装 Node.js 18+
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### 2. 安装 pnpm（或使用 npm）
```bash
npm install -g pnpm
```

### 3. 安装 MySQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# CentOS/RHEL
sudo yum install mysql-server

# 启动 MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置（设置 root 密码）
sudo mysql_secure_installation
```

### 4. 安装 PM2（进程管理）
```bash
npm install -g pm2
```

## 二、代码部署

### 方式一：Git 部署（推荐）

```bash
# 1. 在服务器上克隆代码
cd /var/www
git clone <your-repo-url> dieapp
cd dieapp/backend

# 2. 安装依赖
pnpm install --production

# 3. 复制环境变量文件
cp env.example .env
# 编辑 .env 文件，填入实际配置
nano .env
```

### 方式二：手动上传

```bash
# 1. 在本地打包（排除 node_modules）
tar -czf backend.tar.gz backend/ --exclude='backend/node_modules' --exclude='backend/.env'

# 2. 上传到服务器
scp backend.tar.gz user@your-server:/var/www/

# 3. 在服务器上解压
cd /var/www
tar -xzf backend.tar.gz
cd backend

# 4. 安装依赖
pnpm install --production

# 5. 配置环境变量
cp env.example .env
nano .env
```

## 三、环境变量配置

编辑 `.env` 文件，配置以下内容：

```bash
# 服务器配置
PORT=3000
NODE_ENV=production

# JWT 密钥（使用 generate-jwt-secret.js 生成新的密钥）
JWT_SECRET=your-generated-secret-key

# MySQL 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=dieapp_user
DB_PASSWORD=your-strong-password
DB_NAME=dieapp

# 微信小程序配置
WX_APPID=your-wechat-appid
WX_SECRET=your-wechat-secret

# 短信服务配置
SMS_ACCESS_KEY_ID=your-access-key-id
SMS_ACCESS_KEY_SECRET=your-access-key-secret
SMS_SIGN_NAME=还在吗
SMS_TEMPLATE_CODE=your-template-code

# 应用配置
CHECK_IN_INTERVAL_HOURS=24
GRACE_PERIOD_HOURS=2
REMINDER_BEFORE_HOURS=1
MAX_SMS_COUNT=3
SMS_INTERVAL_MINUTES=30
```

### 生成 JWT 密钥
```bash
node generate-jwt-secret.js
```

## 四、数据库配置

### 1. 创建数据库和用户
```bash
sudo mysql -u root -p
```

```sql
-- 创建数据库
CREATE DATABASE dieapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（推荐使用专用用户，不要用 root）
CREATE USER 'dieapp_user'@'localhost' IDENTIFIED BY 'your-strong-password';

-- 授权
GRANT ALL PRIVILEGES ON dieapp.* TO 'dieapp_user'@'localhost';
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

### 2. 初始化数据库表
```bash
# 启动应用会自动创建表，或手动运行
node src/index.js
# 等待数据库初始化完成后，按 Ctrl+C 停止
```

## 五、使用 PM2 启动服务

### 1. 创建 PM2 配置文件
已创建 `ecosystem.config.js`，直接使用：

```bash
# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs dieapp-backend

# 重启应用
pm2 restart dieapp-backend

# 停止应用
pm2 stop dieapp-backend

# 删除应用
pm2 delete dieapp-backend
```

### 2. 设置开机自启
```bash
pm2 startup
# 按照提示执行命令
pm2 save
```

## 六、Nginx 反向代理（可选）

### 1. 安装 Nginx
```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. 配置 Nginx
创建配置文件 `/etc/nginx/sites-available/dieapp`：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    # 如果需要 HTTPS，取消下面的注释并配置 SSL
    # listen 443 ssl;
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 健康检查
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

### 3. 启用配置
```bash
# Ubuntu/Debian
sudo ln -s /etc/nginx/sites-available/dieapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# CentOS/RHEL
sudo cp /etc/nginx/sites-available/dieapp /etc/nginx/conf.d/dieapp.conf
sudo nginx -t
sudo systemctl restart nginx
```

## 七、防火墙配置

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 八、SSL 证书（HTTPS，推荐）

### 使用 Let's Encrypt（免费）
```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期（已自动配置）
sudo certbot renew --dry-run
```

## 九、监控和维护

### 1. 查看日志
```bash
# PM2 日志
pm2 logs dieapp-backend

# 系统日志
journalctl -u nginx -f
```

### 2. 健康检查
```bash
curl http://localhost:3000/health
```

### 3. 更新代码
```bash
cd /var/www/dieapp/backend
git pull
pnpm install --production
pm2 restart dieapp-backend
```

## 十、安全建议

1. **不要使用 root 用户运行应用**
2. **定期更新系统和依赖**
3. **使用强密码**
4. **配置防火墙**
5. **启用 HTTPS**
6. **定期备份数据库**
7. **监控服务器资源使用情况**
8. **设置日志轮转**

## 十一、常见问题

### 问题1：端口被占用
```bash
# 查看端口占用
sudo lsof -i :3000
# 或
sudo netstat -tulpn | grep 3000
```

### 问题2：数据库连接失败
- 检查 MySQL 是否运行：`sudo systemctl status mysql`
- 检查 `.env` 中的数据库配置
- 检查防火墙设置

### 问题3：PM2 启动失败
```bash
# 查看详细错误
pm2 logs dieapp-backend --lines 100
```

## 十二、备份脚本

创建定期备份脚本 `/var/www/dieapp/backend/backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/dieapp"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# 备份数据库
mysqldump -u dieapp_user -p'your-password' dieapp > $BACKUP_DIR/db_$DATE.sql

# 备份代码（可选）
tar -czf $BACKUP_DIR/code_$DATE.tar.gz /var/www/dieapp/backend

# 删除 7 天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

添加到 crontab：
```bash
crontab -e
# 每天凌晨 2 点备份
0 2 * * * /var/www/dieapp/backend/backup.sh
```

