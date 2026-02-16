// backend/middleware/tenant.js

const mysql = require('mysql2/promise');
const Tenant = require('../models/Tenant');

// 连接池缓存（按租户 code 缓存）
const pools = {};

/**
 * 获取指定租户的数据库连接池
 */
function getTenantConnection(tenantCode) {
  if (!pools[tenantCode]) {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'XIAOYI',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      charset: 'utf8mb4'
    };
    pools[tenantCode] = mysql.createPool(config);
  }
  return pools[tenantCode];
}

/**
 * 租户中间件（Express 兼容）
 */
async function tenantMiddleware(req, res, next) {
  // 跳过 /auth、/images 和 /payments/callback 路由
  if (req.originalUrl.startsWith('/auth/') ||
      req.originalUrl.startsWith('/images/') ||
      req.originalUrl === '/payments/callback') {
    return next();
  }

  let tenantCode;

  // 1. 从请求头获取
  if (req.headers['x-tenant-code']) {
    tenantCode = req.headers['x-tenant-code'];
  }
  // 2. 从 JWT 用户信息获取（如果已认证）
  else if (req.user && req.user.tenantCode) {
    tenantCode = req.user.tenantCode;
  }
  // 3. 从子域名获取（可选）
  else {
    const host = req.get('Host');
    if (host && !host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
      tenantCode = host.split('.')[0];
    }
  }

  if (!tenantCode) {
    return res.status(400).json({
      success: false,
      message: 'Missing x-tenant-code header or invalid context'
    });
  }

  // 验证租户是否存在且启用
  try {
    const [tenants] = await getTenantConnection('global').execute(
      'SELECT id, name, status FROM tenants WHERE tenant_code = ? AND status = 1',
      [tenantCode]
    );

    if (tenants.length === 0) {
      return res.status(404).json({
        success: false,
        message: '租户不存在或已被禁用'
      });
    }

    const currentTenant = tenants[0];
    req.tenantCode = tenantCode;
    req.currentTenant = currentTenant;
    req.tenantDb = getTenantConnection(tenantCode);

    next();
  } catch (error) {
    console.error('租户验证失败:', error);
    return res.status(500).json({
      success: false,
      message: '租户验证服务异常'
    });
  }
}

// 👇 导出中间件函数和连接函数！
module.exports = tenantMiddleware;
module.exports.getTenantConnection = getTenantConnection;