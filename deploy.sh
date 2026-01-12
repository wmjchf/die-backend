#!/bin/bash
# 快速部署脚本

set -e

echo "🚀 开始部署 dieapp-backend..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 安装 pnpm..."
    npm install -g pnpm
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    npm install -g pm2
fi

# 安装依赖
echo "📦 安装依赖..."
pnpm install --production

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在，从 env.example 创建..."
    cp env.example .env
    echo "⚠️  请编辑 .env 文件，填入正确的配置后重新运行此脚本"
    exit 1
fi

# 创建日志目录
mkdir -p logs

# 初始化数据库（如果需要）
echo "🗄️  检查数据库..."
if [ -f "init-db.js" ]; then
    node init-db.js || echo "⚠️  数据库初始化跳过（可能已存在）"
else
    echo "⚠️  数据库初始化脚本不存在，跳过"
fi

# 启动/重启 PM2
echo "🔄 启动应用..."
if pm2 list | grep -q "dieapp-backend"; then
    echo "🔄 重启现有应用..."
    pm2 restart dieapp-backend
else
    echo "🆕 启动新应用..."
    pm2 start ecosystem.config.js
fi

# 保存 PM2 配置
pm2 save

echo "✅ 部署完成！"
echo ""
echo "📊 查看状态: pm2 status"
echo "📋 查看日志: pm2 logs dieapp-backend"
echo "🔄 重启应用: pm2 restart dieapp-backend"
echo "🛑 停止应用: pm2 stop dieapp-backend"

