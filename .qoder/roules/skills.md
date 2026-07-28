# 小蚁搬运 SaaS 平台 — 开发规范（Skills）

> 本文档是项目开发对齐的核心规范，所有新增代码、模块、接口必须严格遵循。

**版本**: v2.0
**最后更新**: 2026-07-26
**主要变更**: OpenAPI 规范从单文件迁移至模块化目录结构

---

## 更新日志

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v2.0 | 2026-07-26 | OpenAPI 模块化拆分：单文件 `openapi.yaml` → `openapi/` 目录结构；新增 $ref 引用规则、命名规则、骨架文件规范；更新 Tags 分类、安全定义、Checklist |
| v1.0 | — | 初始版本 |

---

## 1. 项目结构规范

### 1.1 目录职责

```
xiaoyi-banyun/
├── backend/                 # Node.js + Express 后端
│   ├── config/              # 配置（database.js 等）
│   ├── controllers/         # 控制器 — 请求处理，调用 service/model
│   ├── middleware/           # 中间件（认证、租户、错误处理）
│   ├── models/              # 数据模型 — 封装 SQL 操作
│   ├── routes/              # 路由定义（api.js / admin.js / tenant.js）
│   ├── services/            # 业务服务层（复杂逻辑、第三方集成）
│   ├── utils/               # 工具函数（swagger.js、response.js 等）
│   └── server.js            # 入口文件
├── frontend/miniprogram/    # 微信小程序
├── admin/                   # 总后台（静态 HTML + Bootstrap 5）
├── tenant-admin/            # 租户后台（静态 HTML + Bootstrap 5）
├── deployment/              # 部署文档
├── docs/                    # 项目文档
├── openapi/                 # API 规范（模块化目录）
│   ├── openapi.yaml         # 主入口（聚合 $ref）
│   ├── paths/               # 按业务域拆分的路径定义
│   └── components/          # 可复用组件（schemas, securitySchemes）
├── scripts/                 # 运维/工具脚本
├── test/                    # 集成测试
└── openapi.legacy.yaml      # 旧版单文件 API 规范（备份）
```

### 1.2 文件放置规则

| 类型 | 放置位置 | 禁止 |
|------|---------|------|
| 业务脚本 | `scripts/` | 根目录散落 `.js` / `.sh` |
| 调试/临时文件 | 不提交 | `server_debug*.js`, `temp_*.js` |
| 备份文件 | 不提交 | `*.backup`, `*.bak` |
| 环境配置 | `backend/.env`（gitignore） | 不提交密钥 |
| 环境模板 | `backend/.env.example` | — |

---

## 2. 代码风格规范

### 2.1 通用规则

- **语言**：JavaScript（ES2020+），不使用 TypeScript
- **缩进**：2 空格
- **引号**：单引号
- **分号**：必须
- **行宽**：建议 ≤ 120 字符
- **文件命名**：PascalCase（`OrderController.js`、`AuthController.js`）
- **变量/函数**：camelCase
- **常量**：UPPER_SNAKE_CASE（`JWT_SECRET`、`DB_HOST`）
- **类方法**：统一使用 `static` 方法（当前项目模式）

### 2.2 Controller 规范

```javascript
// backend/controllers/XxxController.js
class XxxController {
  /**
   * 方法说明
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  static async methodName(req, res) {
    try {
      // 1. 参数提取与校验
      // 2. 调用 Model / Service
      // 3. 返回统一格式响应
      return res.status(200).json({
        success: true,
        data: result,
        message: '操作成功'
      });
    } catch (error) {
      console.error('XxxController.methodName error:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = XxxController;
```

**要点**：
- Controller 只负责请求处理与响应，不直接写 SQL
- 每个方法必须有 `try/catch`
- 错误日志必须打印 `controller名.方法名`

### 2.3 Model 规范

```javascript
// backend/models/Xxx.js
const { getTenantConnection } = require('../middleware/tenant');

class Xxx {
  static tableName = 'table_name';

  constructor(data = {}) {
    // 字段映射
  }

  static async findById(id, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      return rows.length > 0 ? new Xxx(rows[0]) : null;
    } finally {
      connection.release();  // 必须释放连接
    }
  }
}

module.exports = Xxx;
```

**要点**：
- Model 封装所有 SQL 操作
- 必须使用 `getTenantConnection(tenantCode)` 获取连接池
- 获取 connection 后必须在 `finally` 中 `release()`
- 构造函数映射数据库字段

### 2.4 Route 规范

```javascript
// backend/routes/xxx.js
const express = require('express');
const router = express.Router();
const XxxController = require('../controllers/XxxController');

// 路由分组用注释分隔
// ======================
// 模块名称 API
// ======================
router.get('/resource', XxxController.list);
router.get('/resource/:id', XxxController.getById);
router.post('/resource', XxxController.create);
router.put('/resource/:id', XxxController.update);
router.delete('/resource/:id', XxxController.remove);

module.exports = router;
```

**要点**：
- 路由文件只做路由映射，不写业务逻辑
- 使用注释块分组相关路由
- RESTful 风格命名

---

## 3. 认证规范

### 3.1 认证体系

项目有 **4 种角色**，各自独立的登录入口：

| 角色 | 登录路由 | JWT payload 字段 |
|------|---------|-----------------|
| 普通用户 | `POST /api/auth/login` | `{ userId, username, role, tenantCode }` |
| 租户管理员 | `POST /api/auth/tenant-login` | `{ userId, username, role: 'tenant_admin', tenantCode }` |
| 公共工人 | `POST /api/auth/worker-login` | `{ userId, username, role: 'worker' }` |
| 总后台管理员 | `POST /api/auth/login`（admin 路由） | `{ userId, username, role: 'admin' }` |

### 3.2 JWT 规范

```javascript
// 签发
const token = jwt.sign(payload, process.env.JWT_SECRET, {
  expiresIn: '7d'
});

// 验证（server.js 全局中间件）
jwt.verify(token, process.env.JWT_SECRET || 'xiaoyi_banyun_secret_key', (err, decoded) => {
  if (!err) req.user = decoded;
});
```

**规则**：
- JWT Secret 必须从 `process.env.JWT_SECRET` 读取，禁止硬编码
- Token 通过 `Authorization: Bearer <token>` 传递
- 全局中间件只做解码，不做拦截（路由层自行判断权限）
- 新增需要认证的路由，必须在 Controller 中检查 `req.user` 存在性

### 3.3 租户识别

租户上下文通过以下优先级获取（在 `tenant.js` 中间件中）：
1. 请求头 `x-tenant-code`
2. JWT 中的 `req.user.tenantCode`
3. 子域名解析（生产环境）

**规则**：
- 所有租户相关 API 必须经过 `tenantMiddleware`
- `/auth/*`、`/admin/*`、`/images/*`、`/payments/callback` 豁免
- 新增路由如需豁免，必须在 `tenant.js` 中显式添加白名单

---

## 4. 数据库规范

### 4.1 连接管理

```javascript
// 统一通过 getTenantConnection 获取连接池
const { getTenantConnection } = require('../middleware/tenant');
const pool = getTenantConnection(tenantCode);
```

**规则**：
- 禁止在 Model/Controller 中直接 `mysql.createConnection()`
- 禁止在 Model/Controller 中 `require('../config/database')` 后自行创建连接
- 所有数据库操作必须通过 `getTenantConnection(tenantCode)` 获取连接池
- 连接使用后必须在 `finally` 中 `release()`

### 4.2 SQL 规范

- 使用参数化查询 `?` 占位符，**禁止字符串拼接 SQL**
- 表名使用复数形式（`orders`、`users`、`tenants`）
- 字段名使用 `snake_case`
- 必须包含 `created_at`、`updated_at` 时间戳字段
- 软删除使用 `deleted_at` 字段（当前项目暂未启用，新增表建议加入）

### 4.3 Schema 变更

- 数据库 DDL 变更必须同步更新 `docs/database/schema.sql`
- 新增表必须同步更新 `openapi/components/schemas/` 下对应模块的 schema
- 禁止直接修改生产数据库，必须通过 SQL 脚本

---

## 5. OpenAPI 规范

### 5.1 核心原则

`openapi/openapi.yaml` 是 API 的 **单一事实来源（Single Source of Truth）**，采用模块化目录结构：

```
openapi/
├── openapi.yaml              # 主入口（聚合 $ref）
├── paths/                    # 按业务域拆分的路径定义
│   ├── auth.yaml             # 认证（4 端点）
│   ├── orders.yaml           # 订单主流程（8 端点）
│   ├── map.yaml              # 地图/轨迹/位置（7 端点，骨架）
│   ├── finance.yaml          # 用户端财务（4 端点）
│   ├── finance-admin.yaml    # 管理端财务（13 端点）
│   ├── referral.yaml         # 用户端推荐（7 端点）
│   ├── referral-admin.yaml   # 管理端推荐（9 端点）
│   ├── payments.yaml         # 支付回调（2 端点）
│   ├── tenants.yaml          # 租户管理（8 端点，骨架）
│   ├── tenant-portal.yaml    # 租户后台（11 端点，骨架）
│   ├── third-party.yaml      # 第三方接入（5 端点）
│   ├── customer-service.yaml # 客服（规划中，空骨架）
│   └── transfer-station.yaml # 转驿（规划中，空骨架）
└── components/
    ├── schemas/              # 按业务域拆分的 Schema
    │   ├── common.yaml       # ErrorResponse + Pagination + ChangePasswordRequest
    │   ├── auth.yaml         # User, UserLogin, UserRegistration, AuthResponse, UserInfoResponse
    │   ├── order.yaml        # OrderPayload, Order, OrderResponse, OrderListResponse
    │   ├── finance.yaml      # Account, Withdrawal, Payment, Commission, SystemConfig + 响应
    │   ├── referral.yaml     # ReferralCampaign, Referral, ReferralReward, ReferralStats + 响应
    │   ├── third-party.yaml  # ThirdPartyOrderCreate, ThirdPartyOrder, ThirdPartyOrderResponse, ReconciliationResponse
    │   └── tenant.yaml       # Tenant（骨架）
    └── security-schemes.yaml # bearerAuth + apiKeyAuth
```

### 5.2 新增/修改 API 时必须

1. **先更新 `openapi/` 下对应模块文件**，再写代码（API-First）
2. 在对应的 `paths/{domain}.yaml` 下添加路由定义
3. 在 `components/schemas/{domain}.yaml` 中定义或更新数据模型
4. 使用 `$ref` 引用，避免重复定义
5. 每个接口必须包含：`summary`、`tags`、`parameters`（如有）、`requestBody`（如有）、`responses`
6. 新增业务域需创建新的 `paths/{domain}.yaml` 和 `components/schemas/{domain}.yaml`，并在 `openapi/openapi.yaml` 中注册 $ref

### 5.3 命名规则

| 规则 | 示例 |
|------|------|
| 文件名：全小写 + 短横线分隔 | `finance-admin.yaml`、`third-party.yaml` |
| 管理端加 `-admin` 后缀 | `finance.yaml`（用户端）/ `finance-admin.yaml`（管理端） |
| Schema：PascalCase | `Order`、`WithdrawalRequest` |
| 请求体用 `*Request` 后缀 | `WithdrawalRequest`、`ThirdPartyOrderCreate` |
| 响应用 `*Response` 后缀 | `OrderResponse`、`OrderListResponse` |
| 合并后统一命名 | `OrderPayload`（合并 CreateOrder + UpdateOrder） |

### 5.4 $ref 引用规则

**路径文件内引用 Schema（相对路径）**：
```yaml
# openapi/paths/orders.yaml 内部
responses:
  '200':
    content:
      application/json:
        schema:
          $ref: '../components/schemas/order.yaml#/OrderResponse'
```

**主入口引用路径和 Schema（./ 前缀）**：
```yaml
# openapi/openapi.yaml
paths:
  /orders:
    $ref: './paths/orders.yaml#/paths/~1orders'
components:
  schemas:
    Order:
      $ref: './components/schemas/order.yaml#/Order'
```

**JSON Pointer 转义规则**：
- 路径中的 `/` 转义为 `~1`
- `~` 转义为 `~0`
- 示例：`/auth/register` → `~1auth~1register`

### 5.5 Schema 合并规则

为避免重复定义，以下 Schema 已合并：

| 合并前 | 合并后 | 说明 |
|--------|--------|------|
| `CreateOrder` + `UpdateOrder` | `OrderPayload` | 字段相同，仅 required 不同 |
| `WithdrawalListResponse` + `AdminWithdrawalListResponse` | `WithdrawalListResponse` | 结构完全相同 |
| 分页结构提取 | `Pagination`（common.yaml） | 所有 List 响应复用 |

### 5.6 骨架文件规范

规划中的模块使用骨架文件预留，格式：

```yaml
# TODO: 待补充完整定义 - 来源 xxx.js XxxController.method
/path/to/endpoint:
  get:
    summary: 接口简述
    description: "# TODO: 待补充完整定义"
    tags:
      - ModuleName
    # ... 基础参数
    responses:
      '200':
        description: 获取成功
      '401':
        description: 未授权
```

**规则**：
- 骨架文件必须标注 `# TODO: 待补充` 注释
- 标注路由来源（如 `来源: admin.js AdminTenantController.list`）
- 空骨架文件（如 customer-service.yaml）使用 `paths: {}`

### 5.7 Tags 分类

| Tag | 对应路径文件 | 范围 |
|-----|------------|------|
| `Authentication` | `auth.yaml` | `/auth/*` |
| `Orders` | `orders.yaml` | `/orders/*` |
| `Map` | `map.yaml` | `/map/*`、`/workers/*/location`、`/orders/*/track` |
| `Finance` | `finance.yaml` | `/finance/*` |
| `AdminFinance` | `finance-admin.yaml` | `/admin/withdrawals/*`、`/admin/commissions/*`、`/admin/configs`、`/admin/reports/*`、`/admin/finance/*` |
| `Referral` | `referral.yaml` | `/referral/*` |
| `AdminReferral` | `referral-admin.yaml` | `/admin/referral/*` |
| `Payments` | `payments.yaml` | `/payments/*`、`/v1/payments/wechat/notify` |
| `AdminTenants` | `tenants.yaml` | `/admin/tenants/*` |
| `Tenant` | `tenant-portal.yaml` | `/tenant/*`、`/auth/tenant-*`、`/auth/worker-*` |
| `ThirdParty` | `third-party.yaml` | `/v1/orders/*`、`/v1/payments/wechat/create` |
| `Webhook` | `webhook.yaml` | `/v1/webhook/*` |
| `CustomerService` | `customer-service.yaml` | 客服（规划中） |
| `TransferStation` | `transfer-station.yaml` | 转驿（规划中） |

### 5.8 响应格式

所有 API 响应统一格式：

```yaml
# 成功响应
{
  "success": true,
  "data": { ... },        # 单对象或数组
  "message": "操作成功"    # 可选
}

# 分页响应
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}

# 错误响应
{
  "success": false,
  "message": "错误描述"
}
```

### 5.9 安全定义

安全方案定义在 `openapi/components/security-schemes.yaml`：

```yaml
bearerAuth:
  type: http
  scheme: bearer
  bearerFormat: JWT

apiKeyAuth:
  type: apiKey
  in: header
  name: X-Api-Key
  description: 第三方平台 API Key
```

需要认证的接口必须声明：
```yaml
security:
  - bearerAuth: []
```

需要租户识别的接口必须包含 `x-tenant-code` 请求头参数：
```yaml
parameters:
  - in: header
    name: x-tenant-code
    required: true
    schema:
      type: string
    description: 租户编码
```

第三方接入接口使用 API Key 认证：
```yaml
security:
  - apiKeyAuth: []
```

---

## 6. 错误处理规范

### 6.1 HTTP 状态码使用

| 状态码 | 场景 |
|-------|------|
| `200` | 成功（GET/PUT） |
| `201` | 创建成功（POST） |
| `400` | 参数校验失败、业务规则不满足 |
| `401` | 未认证 / Token 无效 |
| `403` | 无权限（角色不匹配） |
| `404` | 资源不存在 / 租户不存在 |
| `409` | 资源冲突（重复创建等） |
| `500` | 服务器内部错误 |

### 6.2 错误响应模板

```javascript
// 参数错误
return res.status(400).json({ success: false, message: '请填写必填信息' });

// 未认证
return res.status(401).json({ success: false, message: '请先登录' });

// 无权限
return res.status(403).json({ success: false, message: '无权执行此操作' });

// 不存在
return res.status(404).json({ success: false, message: '资源不存在' });

// 服务器错误（catch 块中）
console.error('ControllerName.methodName error:', error);
return res.status(500).json({ success: false, message: '服务器内部错误' });
```

---

## 7. 前端（小程序）规范

### 7.1 页面结构

```
pages/
├── auth/        # 认证相关
├── index/       # 首页
├── login/       # 登录
├── map/         # 地图
├── orders/      # 订单
├── profile/     # 个人中心
├── referral/    # 推荐
└── settings/    # 设置
```

### 7.2 API 调用

- 所有请求必须携带 `x-tenant-code` 请求头
- Token 存储在 `wx.getStorageSync('token')`
- 统一使用 `wx.request` 封装调用，禁止在页面中硬编码 baseURL

---

## 8. 管理后台规范

### 8.1 技术栈

- 纯 HTML + Bootstrap 5 + 原生 JavaScript
- CDN 引入 Bootstrap，不使用构建工具
- CSS 放在 `assets/css/`，JS 放在 `assets/js/`

### 8.2 认证

- 总后台：`admin/login.html` → Token 存 `localStorage`
- 租户后台：`tenant-admin/login.html` → Token 存 `localStorage`
- 所有 API 请求通过 JS 统一附加 `Authorization` 和 `x-tenant-code` 头

### 8.3 访问入口

每个子系统只有 **一个入口地址**，内部通过 hash 路由（`#xxx`）切换页面：

| 系统 | 入口地址 | 说明 |
|------|---------|------|
| 总后台 | `/admin/` | 总后台管理系统（index.html） |
| 租户后台 | `/tenant-admin/` | 租户管理后台（index.html） |
| 小程序 | 微信小程序 | 用户端小程序 |

**禁止**在文档或代码中散落多个子页面地址（如 `/admin/login.html`、`/admin/tenant-manager.html`）。登录页、功能页均为内部路由，统一从入口进入。

### 8.4 页面布局规范

所有管理后台页面必须遵循统一的三栏布局：

```
┌──────────────────────────────────────────────┐
│                   整体结构                     │
├──────────┬───────────────────────────────────┤
│          │  顶部导航栏（搜索 + 用户菜单）       │
│  侧边栏   ├───────────────────────────────────┤
│ （固定    │                                   │
│  左侧）   │  主内容区（.content）               │
│          │  通过 hash 路由切换 .page            │
│          │                                   │
└──────────┴───────────────────────────────────┘
```

- **侧边栏**：固定左侧，宽度由 CSS 统一控制
- **顶部导航**：搜索框 + 用户下拉菜单（个人资料、设置、退出）
- **主内容区**：每个功能模块是一个 `<div class="page">`，通过 hash 切换 `.active`

### 8.5 侧边栏规范

#### 8.5.1 侧边栏项格式

```html
<li class="nav-item">
  <a class="nav-link" href="#module-name">
    <i class="fas fa-icon me-2"></i>模块名称
  </a>
</li>
```

- 图标统一使用 **Font Awesome 6**（`fas fa-xxx`）
- 图标与文字之间用 `me-2` 间距
- 当前激活项添加 `.active` class

#### 8.5.2 模块命名规则

| 规则 | 说明 | 示例 |
|------|------|------|
| 同名同图标 | 总后台和租户后台共有的模块，名称和图标必须一致 | 两端都有「订单管理 `fa-box-open`」 |
| 名称简洁 | 模块名 ≤ 6 个字，不加后缀 | ✅ 订单管理 ❌ 订单管理列表页 |
| hash 路由 | 与模块英文名对应，小写 + 短横线 | `#third-party`、`#workers` |
| 分组排列 | 按业务逻辑分组，核心业务在前 | 仪表盘 → 订单 → 财务 → 人员 → 系统 |

#### 8.5.3 总后台标准侧边栏

```
📊 仪表盘          #dashboard       fa-tachometer-alt
📦 订单管理         #orders          fa-box-open
💰 财务管理         #finance         fa-coins
📊 抽佣配置         #commission      fa-percent
🏢 租户管理         #tenants         fa-building
👷 接单人员管理      #workers         fa-hard-hat
👥 用户管理         #users           fa-users
📈 报表统计         #reports         fa-chart-line
🔗 第三方接入        #third-party     fa-plug
⚙️ 系统设置         #settings        fa-cog
```

#### 8.5.4 租户后台标准侧边栏

```
📊 仪表盘          #dashboard       fa-tachometer-alt
📦 订单管理         #orders          fa-box-open
👷 接单人员管理      #workers         fa-hard-hat
👥 用户管理         #users           fa-users
💰 财务管理         #finance         fa-coins
📈 报表统计         #reports         fa-chart-bar
⚙️ 租户设置         #settings        fa-cog
```

#### 8.5.5 新增侧边栏模块 Checklist

新增功能模块需要添加到侧边栏时：

- [ ] 确定模块名称（≤ 6 字）和 hash 路由名
- [ ] 选择合适的 Font Awesome 图标（`fa-xxx`）
- [ ] 总后台和租户后台如都有此功能，必须使用 **相同名称和图标**
- [ ] 在侧边栏 `<ul>` 中按分组顺序插入
- [ ] 在主内容区添加对应的 `<div id="hash" class="page">`
- [ ] 在 JS 的 hash 路由切换逻辑中注册

---

## 9. 新增模块 Checklist

新增一个功能模块时，必须完成以下步骤：

### 9.1 API 定义（API-First）
- [ ] 在 `openapi/paths/{domain}.yaml` 中定义接口路径
- [ ] 在 `openapi/components/schemas/{domain}.yaml` 中定义数据模型
- [ ] 在 `openapi/openapi.yaml` 中注册 $ref 引用
- [ ] 如果是新业务域，创建新的路径文件和 schema 文件
- [ ] 骨架端点必须标注 `# TODO: 待补充` 注释

### 9.2 后端实现
- [ ] 创建 Model（`backend/models/Xxx.js`）
- [ ] 创建 Controller（`backend/controllers/XxxController.js`）
- [ ] 在对应路由文件中注册路由
- [ ] Controller 方法必须有 `try/catch`
- [ ] 错误日志格式：`ControllerName.methodName error:`

### 9.3 数据库
- [ ] 如需新表，更新 `docs/database/schema.sql`
- [ ] 同步更新 `openapi/components/schemas/` 下对应模块的 schema
- [ ] 表名使用复数形式，字段名使用 `snake_case`
- [ ] 必须包含 `created_at`、`updated_at` 时间戳

### 9.4 前端/管理后台
- [ ] 管理后台如需页面，创建对应 HTML
- [ ] 侧边栏模块名称 ≤ 6 字，选择合适的 Font Awesome 图标
- [ ] 总后台和租户后台共有的模块，必须使用相同名称和图标

### 9.5 验证与清理
- [ ] 验证 API 响应格式符合规范（`success`、`data`、`message`）
- [ ] 清理调试代码和 console.log
- [ ] 确保所有 $ref 路径正确（相对路径、JSON Pointer 转义）

---

## 10. 禁止事项

### 10.1 安全与数据
1. **禁止**在代码中硬编码数据库密码、JWT Secret 等敏感信息
2. **禁止**字符串拼接 SQL（必须用参数化查询）
3. **禁止**直接修改生产数据库（必须通过 SQL 脚本）
4. **禁止**在 `/opt/wuliu-saas/` 下执行任何未备份的数据库操作

### 10.2 代码规范
5. **禁止**在 Controller 中直接写 SQL（必须通过 Model）
6. **禁止**新增 API 不同步 `openapi/` 模块文件
7. **禁止**在 Model/Controller 中直接 `mysql.createConnection()`（必须用 `getTenantConnection`）
8. **禁止**获取数据库连接后不在 `finally` 中 `release()`

### 10.3 文件与部署
9. **禁止**在根目录散落脚本文件（必须放 `scripts/`）
10. **禁止**提交 `.env`、`node_modules/`、调试文件、备份文件
11. **禁止**SCP 逐文件同步后端代码到服务器（必须用 rsync 或 git）
12. **禁止**用本地 .db 文件 SCP 到服务器覆盖生产数据库

### 10.4 OpenAPI 规范
13. **禁止**在 `openapi/openapi.yaml` 中直接定义路径或 Schema（必须拆分到模块文件）
14. **禁止**在路径文件中使用绝对路径引用 Schema（必须用 `../components/schemas/`）
15. **禁止**重复定义已合并的 Schema（如 `CreateOrder`、`UpdateOrder` 已合并为 `OrderPayload`）
16. **禁止**新增骨架端点不标注 `# TODO: 待补充` 注释

---

## 11. 自动化校验

### 11.1 校验脚本

项目提供 `scripts/validate-skills.sh` 脚本，自动检查代码是否符合本规范。

**运行方式**：
```bash
# 完整校验（输出详细信息）
npm run validate-skills
# 或
./scripts/validate-skills.sh

# 静默模式（只输出错误和统计）
npm run validate-skills:quiet

# 自动修复（清理调试文件、从 git 移除 node_modules 等）
npm run validate-skills:fix
```

### 11.2 检查项

| 类别 | 检查项 | 级别 |
|------|--------|------|
| OpenAPI | 目录结构完整性 | 错误 |
| OpenAPI | 主入口无内联定义 | 错误 |
| OpenAPI | 文件命名规范 | 错误 |
| OpenAPI | $ref 使用相对路径 | 错误 |
| OpenAPI | 骨架端点 TODO 标注 | 通过 |
| 后端 | Controller try/catch | 错误 |
| 后端 | Model 使用 getTenantConnection | 警告 |
| 后端 | 无直接 mysql.createConnection | 错误 |
| 后端 | 无字符串拼接 SQL | 错误 |
| 后端 | 连接在 finally 中 release | 错误 |
| 后端 | Controller 错误日志格式 | 警告 |
| 文件 | 根目录无散落脚本 | 警告 |
| 文件 | .env 未被 git 跟踪 | 错误 |
| 文件 | 无调试/备份文件 | 警告 |
| 文件 | node_modules 未被 git 跟踪 | 错误 |
| 数据库 | schema.sql 存在 | 警告 |
| 管理后台 | 入口文件存在 | 警告 |
| Skills | skills.md 存在且版本正确 | 错误/警告 |

### 11.3 Git Hook 集成

`precommit` 脚本已配置为自动运行 `validate-skills:quiet`，在提交前自动校验。

如需手动触发：
```bash
npm run precommit
```

### 11.4 自动修复能力

`--fix` 选项可自动修复以下问题：
- 清理 `server_debug*.js`、`temp_*.js`、`*.backup`、`*.bak` 文件
- 从 git 中移除被跟踪的 `node_modules`
