const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const path = require('path');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const v1Routes = require('./routes/v1');
const { swaggerUi, specs } = require('./utils/swagger');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 3000; // 优先使用 BACKEND_PORT，其次 PORT，最后默认 3000

// 安全中间件 - 开发环境放宽 CSP 限制
if (process.env.NODE_ENV === 'development') {
  // 开发环境：允许 CDN 和 inline 脚本
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "http://localhost:*", "http://127.0.0.1:*"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    }
  }));
} else {
  // 生产环境：使用默认安全策略
  app.use(helmet());
}

// CORS 配置 - 本地开发环境允许所有来源
app.use(cors({
  origin: function (origin, callback) {
    // 允许没有 origin 的请求（如 Postman、curl 等工具）
    if (!origin) return callback(null, true);
    
    // 检查允许的来源
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-code', 'X-Api-Key']
}));

// 请求限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100 // 限制每个 IP 15 分钟内最多 100 个请求
});
app.use(limiter);

// 提供静态文件服务 (例如，图片)
app.use('/images', express.static(path.join(__dirname, '../frontend/miniprogram/images')));

// 提供管理后台静态文件服务
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// 提供管理后台资源文件服务（CSS、JS 等）
app.use('/assets', express.static(path.join(__dirname, '../admin/assets')));

// 提供租户管理后台静态文件服务
app.use('/tenant-admin', express.static(path.join(__dirname, '../tenant-admin')));

// 提供租户管理后台资源文件服务（CSS、JS 等）
app.use('/tenant-admin/assets', express.static(path.join(__dirname, '../tenant-admin/assets')));

// 解析 JSON 请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 微信支付回调需要 raw body 解析（在 JSON 解析之后注册）
app.use('/api/v1/payments/wechat/notify', express.text({ type: ['text/xml', 'application/xml'] }));

// JWT 认证中间件
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[FATAL] JWT_SECRET environment variable is not set');
      return res.status(500).json({ success: false, message: '服务器配置错误' });
    }

    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        // token 无效，继续执行但不解码用户信息
        return next();
      }
      req.user = decoded;
      next();
    });
  } else {
    next();
  }
});

// OpenAPI/Swagger 文档路由
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// API 路由
app.use('/api', apiRoutes);

// 管理后台路由
app.use('/api', adminRoutes);

// 租户管理后台路由
const tenantRoutes = require('./routes/tenant');
app.use('/api', tenantRoutes);

// 第三方 API v1 路由
app.use('/api/v1', v1Routes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 404 处理
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
  console.log(`API 文档地址：http://localhost:${PORT}/api-docs`);
  console.log(`总后台管理地址：http://localhost:${PORT}/admin/login.html`);
  console.log(`租户管理后台地址：http://localhost:${PORT}/tenant-admin/login.html`);
  console.log(`CORS 配置：允许 localhost 和 127.0.0.1 的所有端口`);
});

module.exports = app;
