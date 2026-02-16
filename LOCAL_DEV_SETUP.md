# 本地开发环境配置指南

## ✅ 已完成的配置优化

### 1. 移除 HTTPS 强制跳转
- ✅ 检查 server.js，确认没有 HTTPS 强制跳转代码
- ✅ 系统使用纯 HTTP 协议，适合本地开发

### 2. CORS 配置优化
- ✅ 允许 localhost 的所有端口访问
- ✅ 允许 127.0.0.1 的所有端口访问
- ✅ 支持跨域请求（带 credentials）
- ✅ 允许的请求方法：GET, POST, PUT, DELETE, OPTIONS
- ✅ 允许的请求头：Content-Type, Authorization, x-tenant-code

### 3. 环境变量配置
- ✅ PORT=4000（后端服务端口）
- ✅ NODE_ENV=development（开发环境）
- ✅ ALLOWED_ORIGINS 包含所有本地开发端口
- ✅ FRONTEND_URL=http://localhost:3000（前端 URL）

### 4. 静态文件服务
- ✅ `/images` - 小程序图片资源
- ✅ `/admin` - PC 管理后台页面
- ✅ `/api-docs` - API 文档（Swagger）

## 📋 本地开发访问地址

### 后端服务
- **API 服务**: http://localhost:4000/api
- **API 文档**: http://localhost:4000/api-docs
- **管理后台**: http://localhost:4000/admin/login.html

### 前端服务
- **微信小程序**: 微信开发者工具打开 `frontend/miniprogram`
- **小程序 API 地址**: http://localhost:4000/api

## 🔧 启动服务

### 启动后端服务
```bash
cd /Users/sunsh80/Downloads/易工到项目/小蚁搬运/backend
npm start
```

服务启动后会显示：
```
小蚁搬运后端服务启动在端口 4000
API 文档地址：http://localhost:4000/api-docs
管理后台地址：http://localhost:4000/admin/login.html
CORS 配置：允许 localhost 和 127.0.0.1 的所有端口
```

### 启动前端小程序
1. 打开微信开发者工具
2. 导入项目：`frontend/miniprogram`
3. 配置 AppID（使用测试号）
4. 编译运行

## 🧪 测试连接

### 测试 API 连接
```bash
# 测试登录 API
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "x-tenant-code: TEST_TENANT" \
  -d '{"username": "test_admin", "password": "password123"}'
```

### 测试 CORS 配置
```bash
# 测试跨域预检请求
curl -X OPTIONS http://localhost:4000/api/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -D - -o /dev/null
```

预期响应：
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization,x-tenant-code
```

## 📝 配置文件说明

### backend/.env
```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=xiaoyi_app
DB_PASSWORD=xiaoyi_pass_2023
DB_NAME=XIAOYI

# 服务器配置
PORT=4000
NODE_ENV=development

# CORS 配置
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost:8080,http://localhost:5173,http://127.0.0.1:*

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-for-xiaoyi-banyun-platform
```

### backend/server.js
- 使用 CORS 中间件，允许本地开发环境的所有来源
- 提供静态文件服务（/images, /admin, /api-docs）
- JWT 认证中间件（可选，不影响未认证请求）
- 请求限制中间件（15 分钟内最多 100 个请求）

## ⚠️ 注意事项

1. **开发环境配置**
   - 使用 HTTP 协议（非 HTTPS）
   - 允许跨域请求
   - 详细的日志输出（DEBUG 级别）

2. **生产环境部署**
   - 需要启用 HTTPS
   - 限制 CORS 来源
   - 减少日志输出
   - 使用更安全的 JWT_SECRET

3. **数据库连接**
   - 确保 MySQL 服务已启动
   - 数据库用户权限正确
   - 数据库 XIAOYI 已创建

## 🎯 测试账户

### 平台管理员（总后台）
- **用户名**: `platform_admin`
- **密码**: `password123`
- **角色**: platform_admin
- **登录地址**: http://localhost:4000/admin/login.html

### 租户管理员
- **用户名**: `test_admin`
- **密码**: `password123`
- **租户**: `TEST_TENANT`
- **角色**: tenant_admin

### 工人
- **用户名**: `test_worker`
- **密码**: `password123`
- **租户**: `TEST_TENANT`
- **角色**: worker

现在本地开发环境已配置完成，前后端连接顺畅，没有 HTTPS 强制跳转问题！
