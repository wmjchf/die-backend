# 域名配置指南 - huozhe.wobufang.com

## 一、DNS 配置

### 1. 在域名服务商处添加 A 记录

登录你的域名管理后台（wobufang.com 的 DNS 管理），添加以下记录：

```
类型: A
主机记录: huozhe
记录值: 你的服务器公网 IP 地址
TTL: 600（或默认值）
```

**示例：**
- 如果你的服务器 IP 是 `123.456.789.012`
- 则添加：`huozhe` → `123.456.789.012`

### 2. 验证 DNS 解析

等待几分钟后，在本地验证：

```bash
# 检查 DNS 解析
ping huozhe.wobufang.com

# 或使用 nslookup
nslookup huozhe.wobufang.com

# 或使用 dig
dig huozhe.wobufang.com
```

应该返回你的服务器 IP 地址。

## 二、安装 Nginx（如果未安装）

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx

# 启动并设置开机自启
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 三、配置 Nginx 反向代理

### 1. 创建 Nginx 配置文件

**Ubuntu/Debian：**
```bash
sudo nano /etc/nginx/sites-available/huozhe.wobufang.com
```

**CentOS/RHEL：**
```bash
sudo nano /etc/nginx/conf.d/huozhe.wobufang.com.conf
```

### 2. 配置文件内容（HTTP 版本）

```nginx
server {
    listen 80;
    server_name huozhe.wobufang.com;

    # 客户端最大请求体大小
    client_max_body_size 10M;

    # 代理到后端服务
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # 请求头设置
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 支持（如果需要）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 健康检查（可选）
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    # 日志配置
    access_log /var/log/nginx/huozhe.access.log;
    error_log /var/log/nginx/huozhe.error.log;
}
```

### 3. 启用配置

**Ubuntu/Debian：**
```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/huozhe.wobufang.com /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

**CentOS/RHEL：**
```bash
# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

## 四、配置 HTTPS（推荐，小程序要求）

### 1. 安装 Certbot

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
```

### 2. 获取 SSL 证书

```bash
sudo certbot --nginx -d huozhe.wobufang.com
```

按照提示操作：
- 输入邮箱地址
- 同意服务条款
- 选择是否重定向 HTTP 到 HTTPS（推荐选择 2，自动重定向）

### 3. 验证证书自动续期

```bash
sudo certbot renew --dry-run
```

证书会自动续期，无需手动操作。

### 4. 更新后的 HTTPS 配置（Certbot 会自动生成）

Certbot 会自动修改你的 Nginx 配置，添加 SSL 相关配置。最终配置类似：

```nginx
server {
    listen 80;
    server_name huozhe.wobufang.com;
    return 301 https://$server_name$request_uri;  # 重定向到 HTTPS
}

server {
    listen 443 ssl http2;
    server_name huozhe.wobufang.com;

    # SSL 证书配置（Certbot 自动添加）
    ssl_certificate /etc/letsencrypt/live/huozhe.wobufang.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/huozhe.wobufang.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    access_log /var/log/nginx/huozhe.access.log;
    error_log /var/log/nginx/huozhe.error.log;
}
```

## 五、防火墙配置

### 1. 开放端口

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. 确保后端服务运行在 localhost:3000

```bash
# 检查后端服务是否运行
pm2 status

# 如果没有运行，启动它
cd /var/www/dieapp/backend
pm2 start ecosystem.config.js
```

## 六、测试配置

### 1. 测试 HTTP（如果未配置 HTTPS）

```bash
# 在服务器上测试
curl http://localhost:3000/health

# 从外部测试
curl http://huozhe.wobufang.com/health
```

### 2. 测试 HTTPS

```bash
# 从外部测试
curl https://huozhe.wobufang.com/health
```

### 3. 测试 API 接口

```bash
# 测试登录接口
curl -X POST https://huozhe.wobufang.com/api/auth/wechat-login \
  -H "Content-Type: application/json" \
  -d '{"code":"test"}'
```

## 七、前端配置修改（后续需要）

配置完成后，需要修改前端的 API 地址：

**文件：`frontend/src/config/index.ts`**

```typescript
export const apiBaseUrl = "https://huozhe.wobufang.com/api";
// 或 HTTP（不推荐）
// export const apiBaseUrl = "http://huozhe.wobufang.com/api";
```

## 八、常见问题排查

### 问题1：502 Bad Gateway

**原因：** 后端服务未运行或端口不对

**解决：**
```bash
# 检查后端服务
pm2 status

# 检查端口占用
sudo netstat -tulpn | grep 3000

# 重启后端服务
pm2 restart dieapp-backend
```

### 问题2：DNS 解析失败

**原因：** DNS 记录未生效

**解决：**
```bash
# 检查 DNS 解析
dig huozhe.wobufang.com

# 清除本地 DNS 缓存（Mac）
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# 清除本地 DNS 缓存（Windows）
ipconfig /flushdns
```

### 问题3：SSL 证书获取失败

**原因：** 域名解析未生效或端口 80 未开放

**解决：**
1. 确保 DNS 解析正确
2. 确保防火墙开放了 80 和 443 端口
3. 确保 Nginx 正在运行
4. 检查域名是否已解析到当前服务器

### 问题4：CORS 跨域错误

**原因：** 后端 CORS 配置问题

**解决：** 检查后端 `src/index.js` 中的 CORS 配置，确保允许你的域名。

## 九、验证清单

- [ ] DNS A 记录已添加并生效
- [ ] Nginx 已安装并运行
- [ ] Nginx 配置文件已创建并启用
- [ ] 防火墙已开放 80 和 443 端口
- [ ] 后端服务已通过 PM2 启动
- [ ] SSL 证书已获取（如果使用 HTTPS）
- [ ] 可以通过域名访问 `/health` 接口
- [ ] 可以通过域名访问 API 接口

## 十、快速命令参考

```bash
# 查看 Nginx 状态
sudo systemctl status nginx

# 测试 Nginx 配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/huozhe.access.log
sudo tail -f /var/log/nginx/huozhe.error.log

# 查看后端服务状态
pm2 status
pm2 logs dieapp-backend

# 查看端口占用
sudo netstat -tulpn | grep 3000
```

