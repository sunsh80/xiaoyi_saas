const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const { swaggerUi, specs } = require('./utils/swagger');

dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 3000; // 优先使用 BACKEND_PORT，其次 PORT，最后默认 3000

// 安全中间件
app.use(helmet());

// CORS配置
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// 请求限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 限制每个IP 15分钟内最多100个请求
});
app.use(limiter);

// 提供静态文件服务 (例如，图片)
const path = require('path');
app.use('/images', express.static(path.join(__dirname, '../frontend/miniprogram/images'))); // 使用绝对路径

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// JWT认证中间件
app.use((req, res, next) => {
  console.log('[DEBUG] JWT Middleware called for path:', req.path, 'method:', req.method);
  const authHeader = req.headers.authorization;
  console.log('[DEBUG] Authorization header:', authHeader);

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // 移除 "Bearer " 前缀
    console.log('[DEBUG] Extracted token:', token);

    jwt.verify(token, process.env.JWT_SECRET || 'xiaoyi_banyun_secret_key', (err, decoded) => {
      if (err) {
        console.log('[DEBUG] JWT Verification failed:', err.message);
        return next(); // 如果token无效，继续执行但不解码用户信息
      }
      console.log('[DEBUG] JWT Verification succeeded, decoded:', decoded);
      req.user = decoded;
      next();
    });
  } else {
    console.log('[DEBUG] No Authorization header or not Bearer, calling next()');
    next();
  }
});

// OpenAPI/Swagger文档路由
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// API路由
app.use('/api', apiRoutes);

// 管理后台路由
app.use('/api', adminRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 添加全局未捕获异常处理器
process.on('uncaughtException', (err) => {
  console.error('全局未捕获异常:', err);
  console.error(err.stack);
  // 不要立即退出，让服务器有机会记录错误
  // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('全局未处理的 Promise 拒绝:', reason);
  console.error(reason instanceof Error ? reason.stack : reason);
});

app.listen(PORT, () => {
  console.log(`小蚁搬运后端服务启动在端口 ${PORT}`);
  console.log(`API文档地址: http://localhost:${PORT}/api-docs`);
});

module.exports = app;