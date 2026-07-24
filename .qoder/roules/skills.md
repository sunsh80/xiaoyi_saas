# 小蚁搬运 SaaS 平台 — 开发规范（Skills）

> 本文档是项目开发对齐的核心规范，所有新增代码、模块、接口必须严格遵循。

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
├── scripts/                 # 运维/工具脚本
├── test/                    # 集成测试
└── openapi.yaml             # API 规范（单一事实来源）
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
- 新增表必须同步更新 `openapi.yaml` 中的相关 schema
- 禁止直接修改生产数据库，必须通过 SQL 脚本

---

## 5. OpenAPI 规范

### 5.1 核心原则

`openapi.yaml` 是 API 的 **单一事实来源（Single Source of Truth）**。

### 5.2 新增/修改 API 时必须

1. **先更新 `openapi.yaml`**，再写代码（API-First）
2. 在对应的 `paths` 下添加路由定义
3. 在 `components/schemas` 中定义或更新数据模型
4. 使用 `$ref` 引用，避免重复定义
5. 每个接口必须包含：`summary`、`tags`、`parameters`（如有）、`requestBody`（如有）、`responses`

### 5.3 Tags 分类

| Tag | 范围 |
|-----|------|
| `Authentication` | `/auth/*` |
| `Orders` | `/orders/*` |
| `Finance` | `/finance/*` |
| `Referral` | `/referral/*` |
| `Map` | `/map/*` |
| `Admin - Tenants` | `/admin/tenants/*` |
| `Admin - Finance` | `/admin/finance/*`, `/admin/commission/*`, `/admin/withdrawals/*` |
| `Admin - Referral` | `/admin/referral/*` |
| `Admin - Reports` | `/admin/reports/*` |
| `Tenant` | `/tenant/*` |

### 5.4 响应格式

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

### 5.5 安全定义

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    TenantCode:
      type: apiKey
      in: header
      name: x-tenant-code
```

需要认证的接口必须声明：
```yaml
security:
  - bearerAuth: []
  - TenantCode: []
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

- [ ] 在 `openapi.yaml` 中定义接口（API-First）
- [ ] 创建 Model（`backend/models/Xxx.js`）
- [ ] 创建 Controller（`backend/controllers/XxxController.js`）
- [ ] 在对应路由文件中注册路由
- [ ] 如需新表，更新 `docs/database/schema.sql`
- [ ] 管理后台如需页面，创建对应 HTML
- [ ] 验证 `npm run validate-api` 通过
- [ ] 清理调试代码和 console.log

---

## 10. 禁止事项

1. **禁止**在代码中硬编码数据库密码、JWT Secret 等敏感信息
2. **禁止**字符串拼接 SQL（必须用参数化查询）
3. **禁止**在 Controller 中直接写 SQL（必须通过 Model）
4. **禁止**新增 API 不同步 `openapi.yaml`
5. **禁止**在根目录散落脚本文件
6. **禁止**提交 `.env`、`node_modules/`、调试文件、备份文件
7. **禁止**直接修改生产数据库（必须通过 SQL 脚本）
8. **禁止**SCP 逐文件同步后端代码到服务器（必须用 rsync 或 git）
