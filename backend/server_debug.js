// server_debug.js - 用于调试，不加载可能出错的 apiRoutes
require('dotenv').config({ path: './.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { swaggerUi, specs } = require('./utils/swagger');
// 注意：不引入 apiRoutes 或 adminRoutes，也不使用 tenantMiddleware

const app = express();
const PORT = process.env.PORT || 4001; // 使用另一个端口

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
app.use('/images', express.static('../frontend/miniprogram/images')); // 注意路径，从 backend 目录出发

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// JWT认证中间件 (这个也可能有问题，但先保留)
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // 移除 "Bearer " 前缀
    const jwt = require('jsonwebtoken'); // 在这里 require，避免顶层加载

    jwt.verify(token, process.env.JWT_SECRET || 'xiaoyi_banyun_secret_key', (err, decoded) => {
      if (err) {
        console.warn('JWT Verification failed:', err.message); // 添加日志
        return next(); // 如果token无效，继续执行但不解码用户信息
      }
      req.user = decoded;
      next();
    });
  } else {
    next();
  }
});

// OpenAPI/Swagger文档路由
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// 添加一个简单的测试路由，不涉及数据库
app.get('/api/test-no-db', (req, res) => {
  res.json({ success: true, message: 'Test route without DB access OK' });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

app.listen(PORT, () => {
  console.log(`调试版服务器启动在端口 ${PORT}`);
  console.log(`测试API (无数据库): http://localhost:${PORT}/api/test-no-db`);
});

module.exports = app;