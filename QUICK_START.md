# 小蚁搬运平台 - 快速启动指南

## 1. 环境准备

### 1.1 确保已安装必要组件
```bash
# 检查 Node.js
node --version

# 检查 MySQL 服务
# 如果您已安装 MySQL Workbench，请确保 MySQL 服务正在运行
# 在 MySQL Workbench 中，点击菜单 Server -> Start Server
# 或者在系统偏好设置中启动 MySQL 服务
```

## 2. 项目初始化

### 2.1 安装依赖
```bash
# 安装项目依赖
npm install

# 后端依赖
cd backend && npm install && cd ..
```

### 2.2 初始化数据库
```bash
# 初始化数据库结构和配置
npm run init-db
```

### 2.3 创建测试用户
```bash
# 创建测试账户
node create-test-users.js
```

## 3. 启动服务

### 3.1 启动后端服务
```bash
# 开发模式启动
npm run dev:backend

# 或直接启动
cd backend && node server.js
```

### 3.2 启动前端（小程序）
```bash
# 在微信开发者工具中打开
frontend/miniprogram
```

## 4. 测试登录

### 4.1 管理员账户
- 用户名: `test_admin`
- 密码: `password123`
- 租户代码: `TEST_TENANT`

### 4.2 工人账户
- 用户名: `test_worker`
- 密码: `password123`
- 租户代码: `TEST_TENANT`

### 4.3 API 测试
```bash
# 登录测试
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "x-tenant-code: TEST_TENANT" \
  -d '{"username": "test_admin", "password": "password123"}'
```

## 5. 常见问题解决

### 5.1 数据库连接问题
如果遇到数据库连接错误，请检查：
1. MySQL 服务是否正在运行（通过 MySQL Workbench 或系统偏好设置）
2. 数据库配置是否正确（backend/.env）
3. 数据库用户权限是否足够
4. MySQL Workbench 中是否能成功连接到本地实例

### 5.2 登录失败
如果登录失败，请确认：
1. 用户名和密码是否正确
2. 租户代码是否正确
3. 用户状态是否为激活状态

## 6. 开发资源

- API 文档: http://localhost:3000/api-docs (或您配置的BACKEND_PORT端口)
- 服务端口: 3000 (可通过BACKEND_PORT环境变量修改)
- 前端路径: frontend/miniprogram

## 7. 端口配置

后端服务支持通过环境变量自定义端口：

1. **BACKEND_PORT** (最高优先级)
2. **PORT** (次优先级)
3. **默认值 4000**

在 backend/.env 文件中设置：
```bash
BACKEND_PORT=3000  # 或其他您选择的端口
```

## 附录：MySQL Workbench 使用说明

如果您使用的是 MySQL Workbench 而不是命令行工具，请注意以下几点：

1. **启动 MySQL 服务**：
   - 打开 MySQL Workbench
   - 点击菜单 Server -> Start Server
   - 或在系统偏好设置中启动 MySQL 服务

2. **连接到数据库**：
   - 在 MySQL Workbench 中，点击 "Local Instance 3306" 连接
   - 输入 root 用户密码
   - 确认服务器正在运行且端口为 3306

3. **验证连接**：
   - 在 MySQL Workbench 中创建新连接
   - 使用 localhost:3306 连接
   - 用户名 root，输入相应密码