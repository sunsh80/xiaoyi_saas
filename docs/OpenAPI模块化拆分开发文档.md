# OpenAPI 模块化拆分开发文档

> 将单文件 `openapi.yaml`（3378 行）按业务域拆分为模块化目录结构，实现可维护、可扩展的 API 规范管理。

---

## 1. 现状分析

### 1.1 当前结构

| 指标 | 值 |
|------|-----|
| 文件 | `openapi.yaml`（单文件 3378 行） |
| 已定义端点 | 46 个（40 个路径） |
| 实际路由端点 | ~75 个（覆盖率 61%） |
| Schemas | 40 个 |
| Tags | 8 个 |
| `$ref` 引用 | 133 次（全部内部引用 `#/components/schemas/...`） |
| 外部文件拆分 | 无 |

### 1.2 缺失端点（按模块）

| 模块 | 缺失数 | 路由文件 |
|------|--------|---------|
| 地图服务 | 7 | `api.js` → MapController |
| 租户管理 | 8 | `admin.js` → AdminTenantController |
| 租户后台 | 11 | `tenant.js` → TenantController + AuthController |
| 管理报表/财务 | 5 | `admin.js` → AdminReportController + AdminFinanceController |
| 微信支付创建 | 1 | `v1.js` → WechatPayController |

### 1.3 冗余 Schema

| 可合并对 | 原因 |
|---------|------|
| `CreateOrder` + `UpdateOrder` | 字段完全相同，仅 required 不同 |
| `ReferralCampaignCreateRequest` + `ReferralCampaignUpdateRequest` | 字段 95% 相同 |
| `WithdrawalListResponse` + `AdminWithdrawalListResponse` | 结构完全相同 |
| `ReferralStats` + `ReferralAdminStats` | Admin 版是基础版超集 |

---

## 2. 目标结构

```
openapi/
├── openapi.yaml                        # 主入口（info + servers + tags + 聚合 $ref）
│
├── paths/                              # 按业务域拆分路径
│   ├── auth.yaml                       # 认证（4 端点）
│   ├── orders.yaml                     # 订单主流程（8 端点）
│   ├── map.yaml                        # 地图/轨迹/位置（7 端点，骨架）
│   ├── finance.yaml                    # 用户端财务（4 端点）
│   ├── finance-admin.yaml              # 管理端财务（11 端点）
│   ├── referral.yaml                   # 用户端推荐（7 端点）
│   ├── referral-admin.yaml             # 管理端推荐（9 端点）
│   ├── payments.yaml                   # 支付回调（2 端点）
│   ├── tenants.yaml                    # 租户管理（8 端点，骨架）
│   ├── tenant-portal.yaml              # 租户后台（11 端点，骨架）
│   ├── third-party.yaml                # 第三方接入（4 端点）
│   ├── customer-service.yaml           # 客服（规划中，空骨架）
│   └── transfer-station.yaml           # 转驿（规划中，空骨架）
│
├── components/
│   ├── schemas/
│   │   ├── common.yaml                 # ErrorResponse + Pagination 通用组件
│   │   ├── auth.yaml                   # User, UserLogin, UserRegistration, AuthResponse, UserInfoResponse
│   │   ├── order.yaml                  # Order, OrderPayload, OrderResponse, OrderListResponse
│   │   ├── finance.yaml                # Account, Withdrawal, Payment, Commission, SystemConfig + 响应
│   │   ├── referral.yaml               # ReferralCampaign, Referral, ReferralReward, ReferralStats + 响应
│   │   ├── third-party.yaml            # ThirdPartyOrderCreate, ThirdPartyOrder, ThirdPartyOrderResponse, ReconciliationResponse
│   │   └── tenant.yaml                 # Tenant（骨架，后续补充）
│   └── security-schemes.yaml           # bearerAuth + apiKeyAuth
```

---

## 3. 命名规则

### 3.1 文件命名

| 规则 | 示例 |
|------|------|
| 全小写 + 短横线分隔 | `finance-admin.yaml`、`third-party.yaml` |
| 路径文件与 schema 文件同名（同域） | `paths/finance.yaml` ↔ `components/schemas/finance.yaml` |
| 管理端加 `-admin` 后缀 | `finance.yaml`（用户端） / `finance-admin.yaml`（管理端） |
| 规划中的域预留空骨架 | `customer-service.yaml`、`transfer-station.yaml` |

### 3.2 Tag 命名

| Tag | 对应路径文件 | 说明 |
|-----|------------|------|
| `Authentication` | `auth.yaml` | 认证 |
| `Orders` | `orders.yaml` | 订单主流程 |
| `Map` | `map.yaml` | 地图/轨迹/位置 |
| `Finance` | `finance.yaml` | 用户端财务 |
| `AdminFinance` | `finance-admin.yaml` | 管理端财务 |
| `Referral` | `referral.yaml` | 用户端推荐 |
| `AdminReferral` | `referral-admin.yaml` | 管理端推荐 |
| `Payments` | `payments.yaml` | 支付 |
| `AdminTenants` | `tenants.yaml` | 租户管理 |
| `Tenant` | `tenant-portal.yaml` | 租户后台 |
| `ThirdParty` | `third-party.yaml` | 第三方接入 |
| `Webhook` | `third-party.yaml` | Webhook 接收 |
| `CustomerService` | `customer-service.yaml` | 客服（规划中） |
| `TransferStation` | `transfer-station.yaml` | 转驿（规划中） |

### 3.3 Schema 命名

| 规则 | 示例 |
|------|------|
| PascalCase | `Order`、`WithdrawalRequest` |
| 请求体用 `*Request` 后缀 | `WithdrawalRequest`、`ThirdPartyOrderCreate` |
| 响应用 `*Response` 后缀 | `OrderResponse`、`OrderListResponse` |
| 合并后统一命名 | `OrderPayload`（合并 CreateOrder + UpdateOrder） |
| 分页结构统一 | `Pagination`（提取到 common.yaml，所有 List 响应复用） |

---

## 4. $ref 注册方案

### 4.1 路径引用

每个路径文件导出标准 `paths` 对象，主入口通过 JSON Pointer 引用：

```yaml
# openapi/openapi.yaml
paths:
  /auth/register:
    $ref: './paths/auth.yaml#/paths/~1auth~1register'
  /auth/login:
    $ref: './paths/auth.yaml#/paths/~1auth~1login'
```

路径文件内部结构：

```yaml
# openapi/paths/auth.yaml
paths:
  /auth/register:
    post:
      summary: 用户注册
      tags: [Authentication]
      # ...
  /auth/login:
    post:
      summary: 用户登录
      # ...
```

> **JSON Pointer 转义规则**：路径中的 `/` 转义为 `~1`，`~` 转义为 `~0`。
> 例如 `/auth/register` → `~1auth~1register`

### 4.2 Schema 引用

每个 schema 文件导出顶层 schema 对象，主入口和路径文件通过 `$ref` 引用：

```yaml
# openapi/openapi.yaml
components:
  schemas:
    ErrorResponse:
      $ref: './components/schemas/common.yaml#/ErrorResponse'
    Order:
      $ref: './components/schemas/order.yaml#/Order'
```

路径文件内部引用 schema（相对路径）：

```yaml
# openapi/paths/orders.yaml 内部
responses:
  '200':
    content:
      application/json:
        schema:
          $ref: '../components/schemas/order.yaml#/OrderResponse'
```

> **注意**：路径文件内的 `$ref` 使用相对于该文件的相对路径（`../components/schemas/...`），
> 主入口文件内的 `$ref` 也使用相对于主入口的相对路径（`./components/schemas/...`）。

### 4.3 SecuritySchemes 引用

```yaml
# openapi/openapi.yaml
components:
  securitySchemes:
    bearerAuth:
      $ref: './components/security-schemes.yaml#/bearerAuth'
    apiKeyAuth:
      $ref: './components/security-schemes.yaml#/apiKeyAuth'
```

---

## 5. Schema 合并方案

### 5.1 OrderPayload（合并 CreateOrder + UpdateOrder）

```yaml
OrderPayload:
  type: object
  required:
    - title
    - pickup_address
    - delivery_address
    - amount
  properties:
    title:
      type: string
      description: 订单标题
    description:
      type: string
      description: 订单描述
    pickup_address:
      type: string
      description: 取货地址
    delivery_address:
      type: string
      description: 送货地址
    pickup_time:
      type: string
      format: date-time
      description: 取货时间
    delivery_time:
      type: string
      format: date-time
      description: 送达时间
    distance:
      type: number
      description: 距离(公里)
    weight:
      type: number
      description: 重量(公斤)
    volume:
      type: number
      description: 体积(立方米)
    amount:
      type: number
      description: 金额
```

- `POST /orders` 的 requestBody → `$ref: OrderPayload`
- `PUT /orders/{id}` 的 requestBody → `$ref: OrderPayload`（去掉 required 约束，在端点级覆盖）

### 5.2 Pagination（提取通用分页结构）

```yaml
# common.yaml
Pagination:
  type: object
  properties:
    page:
      type: integer
      example: 1
    limit:
      type: integer
      example: 10
    total:
      type: integer
      example: 100
    pages:
      type: integer
      example: 10
```

所有 `*ListResponse` schema 中的 pagination 字段统一引用：
```yaml
pagination:
  $ref: '../components/schemas/common.yaml#/Pagination'
```

### 5.3 删除冗余 Schema

| 删除 | 替换为 |
|------|--------|
| `CreateOrder` | `OrderPayload` |
| `UpdateOrder` | `OrderPayload` |
| `AdminWithdrawalListResponse` | `WithdrawalListResponse` |
| `ReferralCampaignUpdateRequest` 独有字段 | 在端点级通过 `allOf` 扩展 `ReferralCampaignCreateRequest` |

---

## 6. 端点清点与归属（不丢不重核对表）

### 6.1 已有端点（46 个）

#### auth.yaml — Authentication（4 个）
| # | 方法 | 路径 | 原行号 |
|---|------|------|--------|
| 1 | POST | `/auth/register` | L13 |
| 2 | POST | `/auth/login` | L44 |
| 3 | GET | `/auth/me` | L75 |
| 4 | PUT | `/auth/change-password` | L102 |

#### orders.yaml — Orders（8 个）
| # | 方法 | 路径 | 原行号 |
|---|------|------|--------|
| 5 | GET | `/orders` | L158 |
| 6 | POST | `/orders` | L210 |
| 7 | GET | `/orders/{id}` | L249 |
| 8 | PUT | `/orders/{id}` | L287 |
| 9 | PUT | `/orders/{id}/assign` | L332 |
| 10 | PUT | `/orders/{id}/start` | L409 |
| 11 | PUT | `/orders/{id}/complete` | L454 |
| 12 | PUT | `/orders/{id}/cancel` | L499 |

#### finance.yaml — Finance（4 个）
| # | 方法 | 路径 | 原行号 |
|---|------|------|--------|
| 13 | GET | `/finance/account` | L544 |
| 14 | POST | `/finance/withdrawals` | L571 |
| 15 | GET | `/finance/withdrawals` | L609 |
| 16 | GET | `/finance/payments` | L654 |

#### payments.yaml — Payments（2 个）
| # | 方法 | 路径 | 原行号 |
|---|------|------|--------|
| 17 | POST | `/payments/callback` | L699 |
| 18 | POST | `/v1/payments/wechat/notify` | L2061 |

#### finance-admin.yaml — AdminFinance（8 个）
| # | 方法 | 路径 | 原行号 |
|---|------|------|--------|
| 19 | GET | `/admin/withdrawals` | L739 |
| 20 | PUT | `/admin/withdrawals/{id}/approve` | L789 |
| 21 | PUT | `/admin/withdrawals/{id}/reject` | L828 |
| 22 | PUT | `/admin/withdrawals/{id}/processing` | L964 |
| 23 | GET | `/admin/commissions` | L876 |
| 24 | GET | `/admin/commissions/statistics` | L925 |
| 25 | GET | `/admin/configs` | L1003 |
| 26 | PUT | `/admin/configs` | L1040 |

#### referral.yaml — Referral（7 个）
| # | 方法 | 路径 | 原行号 |
|---|------|------|--------|
| 27 | GET | `/referral/campaigns` | L1096 |
| 28 | GET | `/referral/campaigns/{id}` | L1134 |
| 29 | GET | `/referral/stats` | L1182 |
| 30 | GET | `/referral/rewards` | L1218 |
| 31 | GET | `/referral/total-rewards` | L1263 |
| 32 | POST | `/referral/generate-link` | L1301 |
| 33 | POST | `/referral/confirm` | L1361 |

#### referral-admin.yaml — AdminReferral（9 个）
| # | 方法 | 路径 | 原行号 |
|---|------|------|--------|
| 34 | GET | `/admin/referral/campaigns` | L1424 |
| 35 | POST | `/admin/referral/campaigns` | L1468 |
| 36 | GET | `/admin/referral/campaigns/{id}` | L1519 |
| 37 | PUT | `/admin/referral/campaigns/{id}` | L1566 |
| 38 | PUT | `/admin/referral/campaigns/{id}/activate` | L1628 |
| 39 | PUT | `/admin/referral/campaigns/{id}/pause` | L1674 |
| 40 | PUT | `/admin/referral/campaigns/{id}/end` | L1720 |
| 41 | GET | `/admin/referral/stats` | L1766 |
| 42 | GET | `/admin/referral/list` | L1819 |

#### third-party.yaml — ThirdParty（4 个）
| # | 方法 | 路径 | 原行号 |
|---|------|------|--------|
| 43 | POST | `/v1/orders` | L1890 |
| 44 | GET | `/v1/orders/{order_no}` | L1931 |
| 45 | POST | `/v1/orders/{order_no}/cancel` | L1965 |
| 46 | GET | `/v1/orders/reconciliation` | L2009 |

### 6.2 缺失端点（骨架预留，29 个）

#### map.yaml — Map（7 个，骨架）
| # | 方法 | 路径 | 路由来源 |
|---|------|------|---------|
| M1 | GET | `/map/search-address` | api.js |
| M2 | POST | `/map/geocode` | api.js |
| M3 | POST | `/map/reverse-geocode` | api.js |
| M4 | POST | `/map/calculate-distance` | api.js |
| M5 | GET | `/workers/{workerId}/location` | api.js |
| M6 | PUT | `/workers/location` | api.js |
| M7 | GET | `/orders/{orderId}/track` | api.js |

#### tenants.yaml — AdminTenants（8 个，骨架）
| # | 方法 | 路径 | 路由来源 |
|---|------|------|---------|
| T1 | GET | `/admin/tenants` | admin.js |
| T2 | GET | `/admin/tenants/pending` | admin.js |
| T3 | GET | `/admin/tenants/{id}` | admin.js |
| T4 | PUT | `/admin/tenants/{id}/approve` | admin.js |
| T5 | PUT | `/admin/tenants/{id}/reject` | admin.js |
| T6 | PUT | `/admin/tenants/{id}` | admin.js |
| T7 | DELETE | `/admin/tenants/{id}` | admin.js |
| T8 | PUT | `/admin/tenants/{id}/toggle-status` | admin.js |

#### tenant-portal.yaml — Tenant（11 个，骨架）
| # | 方法 | 路径 | 路由来源 |
|---|------|------|---------|
| P1 | POST | `/auth/tenant-register` | tenant.js |
| P2 | POST | `/auth/worker-register` | tenant.js |
| P3 | POST | `/auth/tenant-login` | tenant.js |
| P4 | POST | `/auth/worker-login` | tenant.js |
| P5 | GET | `/tenant/info` | tenant.js |
| P6 | GET | `/tenant/dashboard` | tenant.js |
| P7 | GET | `/tenant/orders` | tenant.js |
| P8 | GET | `/tenant/workers` | tenant.js |
| P9 | GET | `/tenant/users` | tenant.js |
| P10 | GET | `/tenant/finance/overview` | tenant.js |
| P11 | PUT | `/tenant/settings` | tenant.js |

#### finance-admin.yaml — 补充缺失（5 个，骨架）
| # | 方法 | 路径 | 路由来源 |
|---|------|------|---------|
| F1 | GET | `/admin/reports/statistics` | admin.js |
| F2 | GET | `/admin/finance/overview` | admin.js |
| F3 | GET | `/admin/commission/config` | admin.js |
| F4 | PUT | `/admin/commission/config` | admin.js |
| F5 | GET | `/admin/orders/{id}/commission` | admin.js |

#### third-party.yaml — 补充缺失（1 个，骨架）
| # | 方法 | 路径 | 路由来源 |
|---|------|------|---------|
| X1 | POST | `/v1/payments/wechat/create` | v1.js |

#### customer-service.yaml — 客服（规划中，空骨架）

#### transfer-station.yaml — 转驿（规划中，空骨架）

---

## 7. Schema 清点与归属（40 → 36 个，合并 4 个）

### common.yaml（3 个）
| Schema | 来源 | 说明 |
|--------|------|------|
| `ErrorResponse` | 原 ErrorResponse | 通用错误响应 |
| `Pagination` | 新提取 | 通用分页结构 |
| `ChangePasswordRequest` | 原内联定义 | 修改密码请求体 |

### auth.yaml（5 个）
| Schema | 来源 |
|--------|------|
| `UserRegistration` | 原 UserRegistration |
| `UserLogin` | 原 UserLogin |
| `AuthResponse` | 原 AuthResponse |
| `UserInfoResponse` | 原 UserInfoResponse |
| `User` | 原 User |

### order.yaml（4 个，合并 2→1）
| Schema | 来源 | 说明 |
|--------|------|------|
| `OrderPayload` | 合并 CreateOrder + UpdateOrder | 统一订单请求体 |
| `Order` | 原 Order | 订单数据模型 |
| `OrderResponse` | 原 OrderResponse | 订单响应 |
| `OrderListResponse` | 原 OrderListResponse | 订单列表响应 |

### finance.yaml（12 个，合并 2→1）
| Schema | 来源 | 说明 |
|--------|------|------|
| `Account` | 原 Account | 账户模型 |
| `AccountResponse` | 原 AccountResponse | 账户响应 |
| `WithdrawalRequest` | 原 WithdrawalRequest | 提现请求 |
| `Withdrawal` | 原 Withdrawal | 提现模型 |
| `WithdrawalResponse` | 原 WithdrawalResponse | 提现响应 |
| `WithdrawalListResponse` | 合并 WithdrawalListResponse + AdminWithdrawalListResponse | 提现列表（统一） |
| `Payment` | 原 Payment | 支付模型 |
| `PaymentListResponse` | 原 PaymentListResponse | 支付列表响应 |
| `Commission` | 原 Commission | 佣金模型 |
| `CommissionListResponse` | 原 CommissionListResponse | 佣金列表响应 |
| `CommissionStatisticsResponse` | 原 CommissionStatisticsResponse | 佣金统计响应 |
| `SystemConfig` | 原 SystemConfig | 系统配置 |

### referral.yaml（11 个）
| Schema | 来源 |
|--------|------|
| `ReferralCampaign` | 原 ReferralCampaign |
| `Referral` | 原 Referral |
| `ReferralReward` | 原 ReferralReward |
| `ReferralStats` | 原 ReferralStats |
| `ReferralAdminStats` | 原 ReferralAdminStats |
| `ReferralRewardsResponse` | 原 ReferralRewardsResponse |
| `ShareInfo` | 原 ShareInfo |
| `ReferralCampaignCreateRequest` | 原 ReferralCampaignCreateRequest |
| `ReferralCampaignUpdateRequest` | 原 ReferralCampaignUpdateRequest |
| `ReferralCampaignListResponse` | 原 ReferralCampaignListResponse |
| `ReferralListResponse` | 原 ReferralListResponse |

### third-party.yaml（4 个）
| Schema | 来源 |
|--------|------|
| `ThirdPartyOrderCreate` | 原 ThirdPartyOrderCreate |
| `ThirdPartyOrder` | 原 ThirdPartyOrder |
| `ThirdPartyOrderResponse` | 原 ThirdPartyOrderResponse |
| `ReconciliationResponse` | 原 ReconciliationResponse |

### tenant.yaml（1 个，骨架）
| Schema | 来源 |
|--------|------|
| `Tenant` | 原 Tenant |

### 合并统计

| 指标 | 拆分前 | 拆分后 |
|------|--------|--------|
| Schema 总数 | 40 | 36（合并 4 个冗余） |
| 新增通用组件 | — | `Pagination`、`ChangePasswordRequest` |
| 路径文件 | 1（内嵌） | 13 个文件 |
| 主入口行数 | 3378 | ~200 |
| 最大单文件行数 | 3378 | ~400 |

---

## 8. 执行步骤

### Phase 1：目录与通用组件
1. 创建 `openapi/`、`openapi/paths/`、`openapi/components/schemas/` 目录
2. 编写 `common.yaml`（ErrorResponse + Pagination + ChangePasswordRequest）
3. 编写 `security-schemes.yaml`（bearerAuth + apiKeyAuth）

### Phase 2：Schema 拆分
4. 拆分 `auth.yaml`（5 schemas）
5. 拆分 `order.yaml`（4 schemas，含 OrderPayload 合并）
6. 拆分 `finance.yaml`（12 schemas，含 WithdrawalListResponse 合并）
7. 拆分 `referral.yaml`（11 schemas）
8. 拆分 `third-party.yaml`（4 schemas）
9. 创建 `tenant.yaml` 骨架（1 schema）

### Phase 3：路径拆分
10. 拆分 `auth.yaml`（4 endpoints）
11. 拆分 `orders.yaml`（8 endpoints）
12. 拆分 `finance.yaml`（4 endpoints）
13. 拆分 `finance-admin.yaml`（8+5 endpoints）
14. 拆分 `referral.yaml`（7 endpoints）
15. 拆分 `referral-admin.yaml`（9 endpoints）
16. 拆分 `payments.yaml`（2 endpoints）
17. 拆分 `third-party.yaml`（4+1 endpoints）

### Phase 4：骨架文件
18. 创建 `map.yaml` 骨架（7 endpoints，TODO 注释）
19. 创建 `tenants.yaml` 骨架（8 endpoints，TODO 注释）
20. 创建 `tenant-portal.yaml` 骨架（11 endpoints，TODO 注释）
21. 创建 `customer-service.yaml` 空骨架
22. 创建 `transfer-station.yaml` 空骨架

### Phase 5：主入口组装
23. 编写 `openapi/openapi.yaml`（聚合所有 $ref）

### Phase 6：验证与清理
24. 校验端点总数 = 46（已有）+ 29（骨架）= 75
25. 校验 Schema 总数 = 36
26. 更新 `server.js` 指向新入口
27. 清理 `swagger-jsdoc` 死代码
28. 备份原 `openapi.yaml` → `openapi.legacy.yaml`
29. 更新 skills 文档中的 OpenAPI 规范说明

---

## 9. 验证清单

拆分完成后逐项检查：

- [ ] 端点总数：已有 46 个全部迁移，无丢失
- [ ] Schema 总数：40 → 36（4 个合并），无丢失
- [ ] 所有 `$ref` 路径正确（相对路径、JSON Pointer 转义）
- [ ] Tag 名称与原版一致（8 个已有 + 6 个新增）
- [ ] securitySchemes 定义完整（bearerAuth + apiKeyAuth）
- [ ] 骨架文件标注 `# TODO: 待补充` 注释
- [ ] 主入口 `openapi.yaml` 可被 Swagger UI 正确解析
- [ ] 原 `openapi.yaml` 已备份为 `openapi.legacy.yaml`
- [ ] `server.js` 指向新入口文件
- [ ] `swagger-jsdoc` 死代码已清理

---

**文档版本**: v1.0
**创建日期**: 2026-07-26
**状态**: 待执行
