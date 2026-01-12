// PM2 进程管理配置文件
// 注意：PM2 配置文件需要使用 CommonJS 格式
module.exports = {
  apps: [
    {
      name: "dieapp-backend",
      script: "./src/index.js",
      instances: 1, // 单实例，如需多实例可改为 "max" 或数字
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      // 日志配置
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      // 自动重启配置
      autorestart: true,
      watch: false, // 生产环境建议关闭
      max_memory_restart: "500M", // 内存超过 500M 自动重启
      // 其他配置
      min_uptime: "10s", // 最小运行时间
      max_restarts: 10, // 最大重启次数
      restart_delay: 4000, // 重启延迟
      // 优雅关闭
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};

