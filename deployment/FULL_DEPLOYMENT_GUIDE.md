# 小蚁搬运平台 - 完整部署与使用指南

> 版本：v2.0 | 更新时间：2026-02-17

## 目录

1. [项目概述](#项目概述)
2. [系统架构](#系统架构)
3. [快速开始](#快速开始)
4. [环境配置](#环境配置)
5. [安装步骤](#安装步骤)
6. [功能模块](#功能模块)
7. [租户注册与审批](#租户注册与审批)
8. [工人入驻](#工人入驻)
9. [测试账户](#测试账户)
10. [API 文档](#api 文档)
11. [生产环境部署](#生产环境部署)
12. [常见问题](#常见问题)

---

## 项目概述

小蚁搬运是一个**SaaS 架构的多租户跑腿装卸平台**，支持货物的装卸搬运工作，包含完整的支付、提现、推荐拉新和抽佣功能。

### 核心特性

- ✅ **多租户架构** - 支持多个租户（商户）独立运营
- ✅ **租户隔离** - 数据按租户严格隔离，保障安全
- ✅ **工人管理** - 支持租户自有工人和公共工人池
- ✅ **订单管理** - 完整的订单创建、分配、执行流程
- ✅ **财务系统** - 支付、结算、提现、佣金计算
- ✅ **推荐拉新** - 推荐活动管理和奖励机制
- ✅ **总后台管理** - 租户审批、财务管理、数据统计
- ✅ **租户后台** - 租户独立管理订单、工人、用户

### 技术栈

| 模块 | 技术 |
|------|------|
| **后端** | Node.js + Express |
| **数据库** | MySQL 8.0+ |
| **前端** | 微信小程序 |
| **管理后台** | HTML5 + Bootstrap 5 |
| **API 文档** | Swagger/OpenAPI |
| **认证** | JWT |

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     小蚁搬运平台                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   小程序端   │    │  总后台管理  │    │  租户管理后台│     │
│  │             │    │             │    │             │     │
│  │ - 用户登录   │    │ - 租户审批   │    │ - 订单管理   │     │
│  │ - 租户注册   │    │ - 租户管理   │    │ - 工人管理   │     │
│  │ - 工人入驻   │    │ - 财务管理   │    │ - 用户管理   │     │
│  │ - 订单下单   │    │ - 报表统计   │    │ - 财务报表   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                     后端 API 服务                             │
│  - 认证服务（登录、注册、JWT）                                │
│  - 租户服务（注册、审批、管理）                               │
│  - 订单服务（创建、分配、完成）                               │
│  - 工人服务（入驻、接单、位置）                               │
│  - 财务服务（支付、结算、提现、佣金）                         │
│  - 推荐服务（活动、奖励、统计）                               │
├─────────────────────────────────────────────────────────────┤
│                     MySQL 数据库                             │
│  - tenants 表（租户信息）                                    │
│  - users 表（用户信息）                                      │
│  - orders 表（订单信息）                                     │
│  - workers 表（工人信息）                                    │
│  - 财务相关表（支付、佣金、提现）                             │
│  - 推荐相关表（活动、奖励）                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 快速开始

### 1. 克隆项目

```bash
git clone git@github.com:sunsh80/xiaoyi_saas.git
cd xiaoyi_saas
```

### 2. 安装依赖

```bash
# 安装主项目依赖
npm install

# 安装后端依赖
cd backend
npm install
cd ..
```

### 3. 配置环境

编辑 `backend/.env` 文件：

```env
# 环境配置
NODE_ENV=development
BACKEND_PORT=4000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=xiaoyi_app
DB_PASSWORD=xiaoyi_pass_2023
DB_NAME=XIAOYI

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-for-xiaoyi-banyun-platform

# CORS 配置
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost:8080
```

### 4. 初始化数据库

```bash
npm run init-db
```

### 5. 创建测试数据

```bash
node create-test-users.js
```

### 6. 启动服务

```bash
npm run dev
```

访问地址：
- **API 服务**: http://localhost:4000
- **API 文档**: http://localhost:4000/api-docs
- **总后台**: http://localhost:4000/admin/login.html
- **租户后台**: http://localhost:4000/tenant-admin/login.html

---

## 环境配置

### 系统要求

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| **Node.js** | 14+ | 推荐 16+ |
| **MySQL** | 8.0+ | 需要支持 UTF8MB4 |
| **npm** | 6+ | 随 Node.js 安装 |
| **Git** | 2.0+ | 版本控制 |

### 数据库配置

1. **创建数据库用户**（如果不存在）：

```sql
CREATE USER 'xiaoyi_app'@'localhost' IDENTIFIED BY 'xiaoyi_pass_2023';
GRANT ALL PRIVILEGES ON *.* TO 'xiaoyi_app'@'localhost';
FLUSH PRIVILEGES;
```

2. **创建数据库**：

```sql
CREATE DATABASE XIAOYI CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. **验证连接**：

```bash
mysql -u xiaoyi_app -p
```

### 环境变量说明

| 变量名 | 说明 | 默认值 |
|-------|------|-------|
| `NODE_ENV` | 运行环境 | `development` |
| `BACKEND_PORT` | 后端服务端口 | `4000` |
| `DB_HOST` | 数据库主机 | `localhost` |
| `DB_PORT` | 数据库端口 | `3306` |
| `DB_USER` | 数据库用户 | `root` |
| `DB_PASSWORD` | 数据库密码 | - |
| `DB_NAME` | 数据库名称 | `XIAOYI` |
| `JWT_SECRET` | JWT 密钥 | - |
| `ALLOWED_ORIGINS` | CORS 允许的来源 | `localhost` 相关 |

---

## 安装步骤

### 完整安装（本地开发）

```bash
# 1. 克隆项目
git clone git@github.com:sunsh80/xiaoyi_saas.git
cd xiaoyi_saas

# 2. 安装依赖
npm install
cd backend && npm install && cd ..

# 3. 配置环境
cp backend/.env.example backend/.env
# 编辑 backend/.env 文件

# 4. 初始化数据库
npm run init-db

# 5. 创建测试数据
node create-test-users.js

# 6. 启动服务
npm run dev
```

### 快速安装（生产环境）

```bash
# 1. 克隆项目（精简版）
git clone git@github.com:sunsh80/xiaoyi_saas.git
cd xiaoyi_saas

# 2. 安装依赖
npm install
cd backend && npm install && cd ..

# 3. 配置环境
# 编辑 backend/.env 文件，配置生产环境数据库

# 4. 初始化数据库
npm run init-db

# 5. 使用 PM2 启动（生产环境）
npm install -g pm2
pm2 start backend/server.js --name xiaoyi-banyun
pm2 save
pm2 startup
```

---

## 功能模块

### 1. 用户认证系统

- 用户注册（租户用户、工人）
- 用户登录（JWT 认证）
- 租户管理员登录
- 公共工人登录
- 密码修改

### 2. 租户管理系统

- 租户注册（需审批）
- 租户审批（总后台）
- 租户编码自动生成
- 租户数据隔离
- 租户设置管理

### 3. 订单管理系统

- 订单创建
- 订单分配
- 订单状态跟踪
- 订单完成确认
- 订单取消

### 4. 工人管理系统

- 工人入驻（免审批）
- 工人状态管理
- 工人位置服务
- 工人收入统计
- 公共工人池

### 5. 财务管理系统

- 订单支付
- 佣金计算
- 提现申请
- 提现审批
- 财务报表

### 6. 推荐拉新系统

- 推荐活动管理
- 推荐码生成
- 推荐关系绑定
- 推荐奖励计算
- 推荐统计

### 7. 总后台管理

- 租户审批
- 租户管理
- 财务管理
- 报表统计
- 系统设置

### 8. 租户后台管理

- 订单管理
- 工人管理
- 用户管理
- 财务报表
- 租户设置

---

## 租户注册与审批

### 注册流程

```
小程序端 → 选择"我是租户" → 填写企业信息 → 提交审批 → 等待总后台审批
```

### 注册表单

| 字段 | 必填 | 说明 |
|------|------|------|
| 企业名称 | ✅ | 公司全称 |
| 企业地址 | ❌ | 详细地址 |
| 联系人姓名 | ✅ | 联系人 |
| 联系电话 | ✅ | 手机号（唯一） |
| 联系邮箱 | ❌ | 电子邮箱 |
| 管理员用户名 | ✅ | 登录用户名 |
| 管理员密码 | ✅ | 登录密码 |

### 审批流程（总后台）

1. 登录总后台：http://localhost:4000/admin/login.html
2. 点击"租户管理"
3. 点击"待审批"查看待审批列表
4. 点击"审批"按钮
5. 可选择自定义租户编码（留空使用系统自动生成）
6. 点击"通过"或"拒绝"

### 租户编码规则

**格式**: `TN + YYYYMMDD + 4 位随机数`

**示例**:
- `TN202602171234` - 2026 年 2 月 17 日生成
- `TN202602180001` - 2026 年 2 月 18 日生成

**自定义编码建议**:
- 公司简称：`XIAOMI`、`TENCENT`
- 品牌名：`SF_EXPRESS`、`JD_LOGISTICS`

### 状态说明

| 状态码 | 租户状态 | 用户状态 | 说明 |
|-------|---------|---------|------|
| 0 | 待审批 | 待激活 | 刚注册，等待审批 |
| 1 | 已启用 | 已激活 | 审批通过，可使用 |
| 2 | 已禁用 | 已禁用 | 审批拒绝或违规 |

---

## 工人入驻

### 入驻流程

```
小程序端 → 选择"我是工人" → 填写个人信息 → 选择技能标签 → 直接入驻
```

### 入驻表单

| 字段 | 必填 | 说明 |
|------|------|------|
| 真实姓名 | ✅ | 身份证姓名 |
| 手机号 | ✅ | 登录账号 |
| 身份证号 | ❌ | 实名认证用 |
| 用户名 | ✅ | 登录用户名 |
| 密码 | ✅ | 登录密码 |
| 技能标签 | ❌ | 搬运、装卸、配送等 |

### 工人特点

- ✅ **无需审批** - 提交后直接激活
- ✅ **公共工人池** - 归属公共池，无租户编码
- ✅ **跨租户接单** - 可接任何租户的订单
- ✅ **立即登录** - 入驻成功后可立即登录

---

## 测试账户

系统预置了以下测试账户：

### 总后台管理员

| 用户名 | 密码 | 角色 | 说明 |
|-------|------|------|------|
| `admin` | `admin123` | 平台管理员 | 总后台登录 |

### 租户管理员

| 租户编码 | 用户名 | 密码 | 角色 | 手机号 |
|---------|-------|------|------|-------|
| `TEST_TENANT` | `test_admin` | `password123` | 租户管理员 | 13800138001 |
| `DEV_TENANT` | `dev_admin` | `password123` | 租户管理员 | 13900139002 |

### 租户普通用户

| 租户编码 | 用户名 | 密码 | 角色 | 手机号 |
|---------|-------|------|------|-------|
| `TEST_TENANT` | `dev_user` | `password123` | 租户用户 | 13900139001 |

### 公共工人

| 用户名 | 密码 | 角色 | 手机号 | 说明 |
|-------|------|------|-------|------|
| `test_worker` | `password123` | 工人 | 13800138002 | 公共工人池 |

---

## API 文档

### 访问地址

启动服务后访问：**http://localhost:4000/api-docs**

### 认证相关 API

| 接口 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `/api/auth/tenant-register` | POST | 公开 | 租户注册 |
| `/api/auth/worker-register` | POST | 公开 | 工人入驻 |
| `/api/auth/tenant-login` | POST | 公开 | 租户管理员登录 |
| `/api/auth/worker-login` | POST | 公开 | 公共工人登录 |
| `/api/auth/login` | POST | 公开 | 租户用户登录 |
| `/api/auth/register` | POST | 认证用户 | 租户下用户注册 |
| `/api/auth/me` | GET | 认证用户 | 获取当前用户信息 |
| `/api/auth/change-password` | PUT | 认证用户 | 修改密码 |

### 租户管理 API（总后台）

| 接口 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `/api/admin/tenants` | GET | 总后台 | 获取租户列表 |
| `/api/admin/tenants/pending` | GET | 总后台 | 获取待审批租户 |
| `/api/admin/tenants/:id` | GET | 总后台 | 获取租户详情 |
| `/api/admin/tenants/:id/approve` | PUT | 总后台 | 审批通过 |
| `/api/admin/tenants/:id/reject` | PUT | 总后台 | 审批拒绝 |
| `/api/admin/tenants/:id` | PUT | 总后台 | 更新租户 |
| `/api/admin/tenants/:id` | DELETE | 总后台 | 删除租户 |

### 租户管理 API（租户后台）

| 接口 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `/api/tenant/info` | GET | 租户管理员 | 获取租户信息 |
| `/api/tenant/dashboard` | GET | 租户管理员 | 获取仪表盘数据 |
| `/api/tenant/orders` | GET | 租户管理员 | 获取订单列表 |
| `/api/tenant/workers` | GET | 租户管理员 | 获取工人列表 |
| `/api/tenant/users` | GET | 租户管理员 | 获取用户列表 |
| `/api/tenant/finance/overview` | GET | 租户管理员 | 获取财务总览 |
| `/api/tenant/settings` | PUT | 租户管理员 | 更新租户设置 |

### 订单管理 API

| 接口 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `/api/orders` | POST | 认证用户 | 创建订单 |
| `/api/orders/:id` | GET | 认证用户 | 获取订单详情 |
| `/api/orders` | GET | 认证用户 | 获取订单列表 |
| `/api/orders/:id/assign` | PUT | 租户管理员 | 分配订单 |
| `/api/orders/:id/start` | PUT | 工人 | 开始订单 |
| `/api/orders/:id/complete` | PUT | 工人 | 完成订单 |
| `/api/orders/:id/cancel` | PUT | 创建人 | 取消订单 |

---

## 生产环境部署

### 1. 服务器要求

| 配置 | 要求 | 说明 |
|------|------|------|
| **CPU** | 2 核 + | 推荐 4 核 + |
| **内存** | 4GB+ | 推荐 8GB+ |
| **存储** | 20GB+ | SSD 推荐 |
| **系统** | Linux | Ubuntu/CentOS |

### 2. 安装 Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo bash -
sudo yum install -y nodejs
```

### 3. 安装 MySQL

```bash
# Ubuntu/Debian
sudo apt-get install -y mysql-server

# CentOS/RHEL
sudo yum install -y mysql-server
```

### 4. 部署项目

```bash
# 克隆项目
git clone git@github.com:sunsh80/xiaoyi_saas.git
cd xiaoyi_saas

# 安装依赖
npm install
cd backend && npm install && cd ..

# 配置生产环境
cp backend/.env.example backend/.env
# 编辑 backend/.env，配置生产数据库

# 初始化数据库
npm run init-db

# 安装 PM2
sudo npm install -g pm2

# 启动服务
pm2 start backend/server.js --name xiaoyi-banyun

# 设置开机自启
pm2 save
pm2 startup
```

### 5. Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6. HTTPS 配置（推荐）

```bash
# 使用 Let's Encrypt
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 常见问题

### 1. 数据库连接失败

**问题**: `Error: connect ECONNREFUSED`

**解决**:
```bash
# 检查 MySQL 服务状态
sudo systemctl status mysql

# 启动 MySQL 服务
sudo systemctl start mysql

# 检查数据库配置
cat backend/.env
```

### 2. 端口被占用

**问题**: `Error: listen EADDRINUSE: address already in use :::4000`

**解决**:
```bash
# 查找占用端口的进程
lsof -i :4000

# 杀死占用进程
kill -9 <PID>

# 或修改端口
# 编辑 backend/.env，修改 BACKEND_PORT=4001
```

### 3. 租户注册失败

**问题**: "该联系电话已被注册"

**原因**: 同一个联系电话只能注册一个租户

**解决**: 更换联系电话或使用其他手机号

### 4. 租户无法登录

**问题**: "账户待审批"

**原因**: 租户状态为 0（待审批）

**解决**: 联系总后台管理员进行审批

### 5. 图片加载失败

**问题**: 小程序图片无法加载

**解决**:
```bash
# 检查图片文件是否存在
ls -la frontend/miniprogram/images/

# 检查静态文件服务配置
# 确认 backend/server.js 中配置了正确的静态文件路径
```

### 6. JWT Token 失效

**问题**: "Token 已过期"

**原因**: Token 默认 24 小时有效期

**解决**: 重新登录获取新 Token

### 7. 跨域问题

**问题**: CORS 错误

**解决**:
```bash
# 编辑 backend/.env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000,your-domain.com

# 重启服务
npm run dev
```

---

## 附录

### A. 项目结构

```
xiaoyi-banyun/
├── backend/                 # 后端服务
│   ├── controllers/         # 控制器
│   ├── middleware/          # 中间件
│   ├── models/              # 数据模型
│   ├── routes/              # 路由
│   ├── utils/               # 工具
│   ├── server.js            # 主服务器
│   └── .env                 # 环境配置
├── frontend/                # 前端小程序
│   └── miniprogram/         # 小程序代码
├── admin/                   # 总后台管理
├── tenant-admin/            # 租户管理后台
├── deployment/              # 部署配置
├── docs/                    # 文档
├── scripts/                 # 脚本
├── test/                    # 测试
├── create-test-users.js     # 测试数据脚本
├── init-db.js               # 数据库初始化
└── package.json             # 项目配置
```

### B. 常用命令

```bash
# 开发环境
npm run dev              # 启动开发服务
npm run init-db          # 初始化数据库
node create-test-users.js  # 创建测试数据

# 生产环境
pm2 start backend/server.js --name xiaoyi-banyun
pm2 stop xiaoyi-banyun
pm2 restart xiaoyi-banyun
pm2 logs xiaoyi-banyun
pm2 delete xiaoyi-banyun

# Git 操作
git pull origin main     # 拉取最新代码
git status               # 查看状态
git add .                # 添加文件
git commit -m "message"  # 提交
git push origin main     # 推送
```

### C. 数据库表结构

主要数据表：

- `tenants` - 租户信息
- `users` - 用户信息
- `orders` - 订单信息
- `payments` - 支付信息
- `commissions` - 佣金信息
- `withdrawals` - 提现信息
- `referral_campaigns` - 推荐活动
- `referrals` - 推荐关系
- `referral_rewards` - 推荐奖励

### D. 相关链接

- **GitHub**: https://github.com/sunsh80/xiaoyi_saas
- **API 文档**: http://localhost:4000/api-docs
- **总后台**: http://localhost:4000/admin/login.html
- **租户后台**: http://localhost:4000/tenant-admin/login.html

---

## 更新日志

### v2.0 (2026-02-17)

- ✅ 新增租户注册审批系统
- ✅ 新增工人入驻功能
- ✅ 新增总后台租户审批功能
- ✅ 新增租户管理后台
- ✅ 新增小程序注册页面
- ✅ 修复模型连接池问题
- ✅ 优化 API 响应性能

### v1.0 (2026-02-16)

- ✅ 基础订单管理功能
- ✅ 用户认证系统
- ✅ 财务管理系统
- ✅ 推荐拉新系统
- ✅ 总后台管理功能

---

**文档版本**: v2.0  
**最后更新**: 2026-02-17  
**维护者**: 小蚁搬运团队
