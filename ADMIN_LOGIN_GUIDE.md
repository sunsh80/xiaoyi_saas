# 管理后台登录指南

## ✅ CSP 问题已修复

管理后台页面现在可以正常加载，不再有 Content Security Policy 限制错误。

### 修复内容
- ✅ 允许 Bootstrap CDN 脚本加载
- ✅ 允许 Font Awesome CDN 样式加载
- ✅ 允许 inline 脚本执行
- ✅ 允许 CDN source map 加载

## 🔐 登录账户汇总

### 1. 平台管理员（总后台）
**权限**: 管理所有租户、系统配置、平台级数据

- **用户名**: `platform_admin`
- **密码**: `password123`
- **租户代码**: `default`
- **角色**: platform_admin
- **登录地址**: http://localhost:4000/admin/login.html

### 2. 租户管理员
**权限**: 管理本租户的订单、用户、财务

- **用户名**: `test_admin`
- **密码**: `password123`
- **租户代码**: `TEST_TENANT`
- **角色**: tenant_admin
- **登录地址**: http://localhost:4000/admin/login.html

### 3. 工人账户
**权限**: 查看订单、接单、处理订单

- **用户名**: `test_worker`
- **密码**: `password123`
- **租户代码**: `TEST_TENANT`
- **角色**: worker
- **登录地址**: http://localhost:4000/admin/login.html

## 📋 登录步骤

### 管理后台登录
1. 访问 http://localhost:4000/admin/login.html
2. 输入用户名和密码
3. 选择租户代码
4. 点击登录按钮

### 小程序登录
1. 打开微信开发者工具
2. 导入项目：`frontend/miniprogram`
3. 进入登录页面
4. 输入手机号和密码
5. 选择租户（会自动选中）
6. 点击登录

## 🎯 测试场景

### 场景 1：平台管理员管理租户
1. 使用 `platform_admin` / `password123` / `default` 登录
2. 访问租户管理页面
3. 查看、编辑、创建租户
4. 查看平台级统计数据

### 场景 2：租户管理员管理订单
1. 使用 `test_admin` / `password123` / `TEST_TENANT` 登录
2. 访问订单管理页面
3. 发布订单、查看订单
4. 管理本租户用户

### 场景 3：工人接单
1. 使用 `test_worker` / `password123` / `TEST_TENANT` 登录
2. 查看待处理订单
3. 接单、处理订单
4. 查看个人统计数据

## ⚠️ 注意事项

1. **租户代码选择**
   - 平台管理员使用 `default`
   - 租户管理员使用对应的租户代码（如 `TEST_TENANT`）
   - 工人使用所属租户的代码

2. **密码安全**
   - 测试环境使用统一密码 `password123`
   - 生产环境请修改为强密码

3. **CSP 配置**
   - 开发环境允许 CDN 和 inline 脚本
   - 生产环境会使用严格的 CSP 策略

## 📝 相关文档

- **本地开发配置**: LOCAL_DEV_SETUP.md
- **CSP 修复报告**: CSP_FIX_COMPLETE.md
- **系统架构说明**: check-system-architecture.js

现在管理后台可以正常登录使用，所有 CSP 问题已解决！
