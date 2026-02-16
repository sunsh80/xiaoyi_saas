# 小蚁搬运平台 - 精简版

## 项目概述
这是一个精简版的小蚁搬运平台，只包含核心功能代码，移除了大型依赖和资源文件，便于快速部署和开发。

## 目录结构
```
xiaoyi-banyun-core/
├── backend/                 # 后端服务
│   ├── controllers/         # 控制器
│   │   ├── AdminFinanceController.js
│   │   ├── AdminReferralController.js
│   │   ├── AuthController.js
│   │   ├── FinanceController.js
│   │   ├── OrderController.js
│   │   └── ReferralController.js
│   ├── middleware/          # 中介件
│   │   └── tenant.js
│   ├── models/              # 数据模型
│   │   ├── Account.js
│   │   ├── AdminUser.js
│   │   ├── Commission.js
│   │   ├── Order.js
│   │   ├── Payment.js
│   │   ├── Referral.js
│   │   ├── ReferralCampaign.js
│   │   ├── ReferralReward.js
│   │   ├── SystemConfig.js
│   │   ├── Tenant.js
│   │   ├── User.js
│   │   └── Withdrawal.js
│   ├── routes/              # 路由
│   │   ├── admin.js
│   │   └── api.js
│   ├── server.js            # 主服务器文件
│   ├── config/              # 配置
│   │   └── database.js
│   └── utils/               # 工具
│       └── swagger.js
├── deployment/              # 部署文档
├── docs/                    # 文档
├── init-db.js               # 数据库初始化脚本
├── openapi.yaml             # API文档
├── package-core.json        # 精简版依赖配置
└── README.md
```

## 核心功能
- 用户认证系统
- 订单管理系统
- 推荐拉新系统
- 财务管理系统
- 租户隔离功能

## 安装和运行

### 1. 安装依赖
```bash
npm install
cd backend && npm install
```

### 2. 配置环境
创建 `backend/.env` 文件：
```env
NODE_ENV=development
BACKEND_PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=xiaoyi_app
DB_PASSWORD=xiaoyi_pass_2023
DB_NAME=XIAOYI
JWT_SECRET=your_secret_key_here
```

### 3. 初始化数据库
```bash
npm run init-db
```

### 4. 启动服务
```bash
npm start
```

## 修复内容
- 订单统计API 500错误修复
- 图片加载错误修复
- 数据库连接问题修复
- 租户中间件优化

## 测试账户
- 管理员: `test_admin` / `password123`
- 工人: `test_worker` / `password123`
- 普通用户: `dev_user` / `password123`
- 开发管理员: `dev_admin` / `password123`

## 与完整版的区别
- 移除了 `node_modules` 目录（~500MB）
- 移除了 `frontend` 目录
- 移除了 `admin` 目录
- 移除了日志文件
- 移除了 Docker 相关大文件
- 保留了所有核心功能代码
- 保留了所有修复内容