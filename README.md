# 小蚁搬运平台

## 项目概述
小蚁搬运是一个SaaS架构的多租户跑腿装卸平台，支持货物的装卸搬运工作，包含完整的支付、提现、推荐拉新和抽佣功能。

此项目已修复以下问题：
1. 订单统计API 500错误
2. 图片加载错误
3. 数据库连接问题

## 修复内容

### 1. 订单统计API问题
- **问题**：前端小程序在获取订单统计数据时遇到500服务器内部错误
- **原因**：Order模型中缺少list方法，导致OrderController调用时出错
- **修复**：实现了完整的Order.list方法，处理租户隔离、分页和统计功能

### 2. 图片加载错误
- **问题**：前端小程序无法加载本地图像资源
- **原因**：图片文件名前导空格和静态文件服务配置问题
- **修复**：重命名文件去除前导空格，修正静态文件服务配置

### 3. 数据库连接问题
- **问题**：数据库连接管理不当，导致连接池问题
- **原因**：在多个模型文件中，代码错误地调用了getTenantConnection获取连接池，然后直接调用其release()方法
- **修复**：修正了ReferralCampaign.js、Referral.js和ReferralReward.js中的数据库连接管理

## 技术栈
- **后端**：Node.js + Express + MySQL
- **前端**：微信小程序
- **数据库**：MySQL
- **API文档**：Swagger/OpenAPI

## 项目结构
```
xiaoyi-banyun-platform/
├── backend/              # 后端服务
│   ├── controllers/      # 控制器
│   ├── middleware/       # 中间件
│   ├── models/          # 数据模型
│   └── routes/          # 路由
├── frontend/             # 前端小程序
│   └── miniprogram/     # 小程序代码
├── admin/               # 管理后台
├── test/                # 测试文件
├── deployment/          # 部署配置
└── scripts/             # 脚本文件
```

## 安装和启动

### 环境要求
- Node.js 14+
- MySQL 8.0+
- npm

### 安装步骤
```bash
# 1. 安装依赖
npm install

# 2. 进入后端目录并安装依赖
cd backend
npm install
cd ..

# 3. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env 文件，配置数据库连接信息

# 4. 初始化数据库
npm run init-db

# 5. 启动服务
npm run dev
```

## 测试账户
系统预置了四个测试账户，方便进行不同角色的功能测试：
- **管理员账户**: `test_admin` / `password123` (角色: 租户管理员, 手机号: 13800138001)
- **工人账户**: `test_worker` / `password123` (角色: 工人, 手机号: 13800138002)
- **普通用户账户**: `dev_user` / `password123` (角色: 租户用户, 手机号: 13900139001)
- **开发管理员账户**: `dev_admin` / `password123` (角色: 租户管理员, 手机号: 13900139002)

## API文档
启动服务后，可在以下地址查看API文档：
- http://localhost:4000/api-docs (或您配置的BACKEND_PORT端口)

## 项目版本

系统维护两个版本：
- **完整版**: 包含所有文件和依赖（1.4GB），适合完整部署和开发
- **精简版**: 移除了大型依赖和资源文件（1.5MB），便于快速部署和开发

精简版位于 `/Users/sunsh80/Downloads/易工到项目/小蚁搬运-精简版` 目录。

## 仓库优化

为了提高效率和降低存储成本，我们已对远程仓库进行了优化：
- 移除了大型依赖文件（如node_modules）
- 优化了仓库大小（从1.4GB减少到约1.5MB）
- 保留了所有核心功能和修复
- 本地开发仍可使用完整版，远程仓库使用精简版

## 服务管理

### 启动服务
```bash
# 启动平台服务
./start-platform.sh
```

### 停止服务
```bash
# 停止平台服务
./stop-platform.sh
```

### 重启服务
```bash
# 重启平台服务
./restart-platform.sh
```

## 图片资源说明

### "我的订单"与"帮助"功能图片
- **"我的订单"图标** - 使用 `/images/order-icon.png` (在 profile.wxml 第60行引用)
- **"帮助"图标** - 使用 `/images/help-icon.png` (在 profile.wxml 第72行引用)
- 这两个是**不同的图片文件**，分别用于不同的功能模块

### 其他图片资源
- **默认头像** - `/images/default-avatar.png` (在 profile.wxml 第6行引用)
- **位置图标** - `/images/location-icon.png` (在 profile.wxml 第68行引用)
- **Logo图标** - `/images/logo.png` (在 login.wxml 中引用)
- **二维码占位符** - `/images/qr-placeholder.png` (在 referral/share.wxml 中引用)
- **微信好友图标** - `/images/wechat-friends.png` (在 referral/share.wxml 中引用)
- **微信朋友圈图标** - `/images/wechat-moments.png` (在 referral/share.wxml 中引用)
- **链接图标** - `/images/link-icon.png` (在 referral/share.wxml 中引用)

## 部署
参见 `deployment/FULL_DEPLOYMENT_GUIDE.md` 文件获取详细的部署说明。

## 性能优化

### API响应优化
- 优化了数据库查询性能
- 添加了分页限制，防止恶意请求
- 添加了性能监控日志
- 减少了API响应时间

## 许可证
MIT License