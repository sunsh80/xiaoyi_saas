# 小蚁搬运平台

> SaaS 架构的多租户跑腿装卸平台 | 完整部署指南见 [deployment/FULL_DEPLOYMENT_GUIDE.md](deployment/FULL_DEPLOYMENT_GUIDE.md)

## 快速开始

```bash
# 1. 克隆项目
git clone git@github.com:sunsh80/xiaoyi_saas.git
cd xiaoyi_saas

# 2. 安装依赖
npm install
cd backend && npm install && cd ..

# 3. 配置环境
cp backend/.env.example backend/.env
# 编辑 backend/.env 文件，配置数据库连接

# 4. 初始化数据库
npm run init-db

# 5. 创建测试数据
node create-test-users.js

# 6. 启动服务
npm run dev
```

访问地址（本地开发环境，端口 4000）：

| 系统 | 入口地址 | 说明 |
|------|---------|------|
| **总后台** | http://localhost:4000/admin/ | 平台总后台管理系统 |
| **租户后台** | http://localhost:4000/tenant-admin/ | 租户管理后台 |
| **小程序** | 微信开发者工具 | 用户端微信小程序 |
| **API 文档** | http://localhost:4000/api-docs | Swagger 接口文档 |

## 测试账户

| 角色 | 租户编码 | 用户名 | 密码 |
|------|---------|-------|------|
| 总后台管理员 | - | `admin` | `admin123` |
| 租户管理员 | `TEST_TENANT` | `test_admin` | `password123` |
| 租户管理员 | `DEV_TENANT` | `dev_admin` | `password123` |
| 租户用户 | `TEST_TENANT` | `dev_user` | `password123` |
| 公共工人 | - | `test_worker` | `password123` |

## 核心功能

- ✅ **多租户架构** - 支持多个租户独立运营，数据严格隔离
- ✅ **租户注册审批** - 租户注册需总后台审批，自动生成租户编码
- ✅ **工人入驻** - 工人免审批入驻，归属公共工人池，跨租户接单
- ✅ **订单管理** - 完整的订单创建、分配、执行流程
- ✅ **第三方订单接入** - 支持第三方平台通过 API 创建订单、查询状态、对账
- ✅ **微信支付** - 集成微信支付，支持 JSAPI/Native 支付
- ✅ **财务系统** - 支付、结算、提现、佣金计算
- ✅ **推荐拉新** - 推荐活动管理和奖励机制
- ✅ **总后台管理** - 租户审批、财务管理、数据统计
- ✅ **租户后台** - 租户独立管理订单、工人、用户、财务

## 技术栈

- **后端**: Node.js + Express + MySQL
- **前端**: 微信小程序
- **管理后台**: HTML5 + Bootstrap 5
- **API 文档**: Swagger/OpenAPI
- **认证**: JWT

## 项目结构

```
xiaoyi-banyun/
├── backend/                 # 后端服务
│   ├── controllers/         # 控制器
│   ├── middleware/          # 中间件
│   ├── models/              # 数据模型
│   └── routes/              # 路由
├── frontend/                # 前端小程序
│   └── miniprogram/         # 小程序代码
├── admin/                   # 总后台管理
├── tenant-admin/            # 租户管理后台
├── deployment/              # 部署配置
├── docs/                    # 文档
├── scripts/                 # 脚本
└── test/                    # 测试
```

## 详细文档

### 部署指南
完整的生产环境部署说明，包括服务器配置、Nginx 配置、HTTPS 配置等。
👉 [deployment/FULL_DEPLOYMENT_GUIDE.md](deployment/FULL_DEPLOYMENT_GUIDE.md)

### 租户注册与审批
详细的租户注册、审批流程说明，包括 API 接口、状态管理等。
👉 [docs/租户注册审批系统说明.md](docs/租户注册审批系统说明.md)

### 第三方订单 API 接入
第三方平台通过 API 创建订单、查询状态、对账的完整接入指南。
👉 [docs/第三方订单API接入指南.md](docs/第三方订单API接入指南.md)

## 常用命令

```bash
# 开发环境
npm run dev              # 启动开发服务
npm run init-db          # 初始化数据库
node create-test-users.js  # 创建测试数据

# 生产环境（使用 PM2）
pm2 start backend/server.js --name xiaoyi-banyun
pm2 stop xiaoyi-banyun
pm2 restart xiaoyi-banyun
pm2 logs xiaoyi-banyun

# Git 操作
git pull origin main     # 拉取最新代码
git add .                # 添加文件
git commit -m "message"  # 提交
git push origin main     # 推送
```

## 环境要求

- **Node.js**: 14+ (推荐 16+)
- **MySQL**: 8.0+
- **npm**: 6+
- **Git**: 2.0+

## 许可证

MIT License

---

**项目仓库**: https://github.com/sunsh80/xiaoyi_saas  
**文档版本**: v2.0  
**最后更新**: 2026-02-17
