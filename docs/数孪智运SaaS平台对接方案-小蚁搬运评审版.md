# 数孪智运 SaaS 平台对接方案

> 本文档描述小蚁搬运如何接收数孪智运 SaaS 平台（以下简称「SaaS」）的 Webhook 推送，实现车辆抵达、订单状态变更等信息的自动同步。
>
> **开发规范**：本方案严格遵循 `.qoder/roules/skills.md` 中的项目规范（API-First、Controller/Model/Route 约定、数据库规范等）。

---

## 概述

### 对接目标

SaaS 平台在订单状态变更时（如车辆出发、车辆抵达、配送完成），通过 Webhook 主动推送通知到小蚁搬运。小蚁搬运接收后更新本地订单状态，实现两个系统间的数据同步。

### 对接方向

```
┌─────────────────┐    Webhook 推送     ┌─────────────────┐
│  数孪智运 SaaS   │ ──────────────────→ │   小蚁搬运       │
│  (api.ifyes.top) │                    │ (xiaoyibanyun)   │
│                  │    HTTP 200 确认    │                  │
│                  │ ←────────────────── │                  │
└─────────────────┘                    └─────────────────┘
```

- **推送方**：数孪智运 SaaS（`https://api.ifyes.top`）
- **接收方**：小蚁搬运（本系统）
- **协议**：HTTPS POST + HMAC-SHA256 签名验证

### 为什么在小蚁侧做适配

| 考量 | 说明 |
|------|------|
| 不改现有 OpenAPI 契约 | 小蚁的 5 种订单状态（pending/assigned/in_progress/completed/cancelled）是数据库级约束，改动影响前端、小程序、工人端 |
| 可插拔 | 未来其他第三方（货拉拉、快狗等）接入时，只需新增一个适配器，不动核心逻辑 |
| 配置化 | 状态映射存数据库，运营可在管理后台调整，无需改代码 |
| 可观测 | 独立日志表记录每次收到的推送，方便排查问题 |

---

## SaaS 侧 Webhook 机制（已从源码确认）

> 以下内容基于 SaaS 源码 `WebhookService.js`、`OrderPushService.js`、`orderEvents.js`、`OrderStatusMapper.js` 的实际实现。

### SaaS 的 Webhook 配置表（`webhook_configs`）

SaaS 使用 SQLite 表 `webhook_configs` 管理回调配置，由平台管理员通过管理 API 配置：

| 字段 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| `id` | INTEGER PK | 自增主键 | `1` |
| `tenant_id` | INTEGER | 租户 ID（外键 → tenants） | `3` |
| `name` | VARCHAR(255) | 配置名称 | `小蚁搬运-状态同步` |
| `event_type` | VARCHAR(100) | 事件类型 | `order.status.changed` |
| `target_url` | VARCHAR(512) | 回调地址 | `https://api.xiaoyibanyun.com/api/v1/webhook/incoming/saas` |
| `api_key` | VARCHAR(255) | SaaS 分配给小蚁的 API Key | `saas_key_xxx` |
| `secret_key` | VARCHAR(255) | 用于签名验证的密钥 | `saas_secret_xxx` |
| `headers` | TEXT | 自定义请求头（JSON 字符串） | `{"X-Custom":"value"}` |
| `is_active` | INTEGER | 是否启用（0/1） | `1` |
| `timeout_seconds` | INTEGER | 超时时间（秒） | `30` |
| `retry_count` | INTEGER | 重试次数 | `3` |
| `retry_interval_seconds` | INTEGER | 重试间隔（秒） | `60` |
| `last_triggered_at` | DATETIME | 最后触发时间 | `2026-07-26 10:30:00` |
| `last_success_at` | DATETIME | 最后成功时间 | `2026-07-26 10:30:01` |
| `last_failure_at` | DATETIME | 最后失败时间 | `NULL` |
| `failure_count` | INTEGER | 连续失败次数 | `0` |

### SaaS Webhook 管理 API

SaaS 提供 5 个管理端点（需管理员认证）：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/webhook/configs` | 获取配置列表 |
| POST | `/api/webhook/configs` | 创建配置 |
| PUT | `/api/webhook/configs/:id` | 更新配置 |
| DELETE | `/api/webhook/configs/:id` | 删除配置 |
| GET | `/api/webhook/logs` | 查看推送日志 |

### SaaS 推送的数据格式（`buildPayload()` 已确认）

SaaS 在订单状态变更时，调用 `WebhookService.onOrderStatusChanged()` → `triggerWebhook()` → `buildPayload()` 构建回调数据，向 `target_url` 发送 POST 请求。

**请求头：**

```
Content-Type: application/json
X-API-Key: <webhook_configs.api_key>
X-SaaS-Signature: sha256=<签名hex>
X-SaaS-Timestamp: <unix秒级时间戳>
X-SaaS-Event-ID: evt_<timestamp>_<随机字符串>
```

> 如果 `webhook_configs.headers` 有值（JSON 字符串），还会合并自定义请求头。

**请求体（完整结构）：**

```json
{
  "event_type": "order.status.changed",
  "event_time": "2026-07-26T10:30:00.000Z",
  "data": {
    "saas_order_id": "SAAS-1090",
    "saas_order_no": "SAAS-1090",
    "tms_order_id": "TP20260726001",
    "tms_order_no": "TP20260726001",
    "old_status": "in_transit",
    "new_status": "delivered",
    "status_label": "已送达",
    "status_description": "订单已送达，等待结算",
    "operator": {
      "type": "carrier",
      "id": 7
    },
    "extra_data": {
      "carrier_id": 7,
      "complete_time": "2026-07-26T10:30:00.000Z"
    }
  }
}
```

**⚠️ 关键字段说明（从源码确认）：**

| 字段 | 取值逻辑 | 说明 |
|------|---------|------|
| `data.saas_order_id` | `orderData.order_id \|\| orderData.id` | **优先使用第三方订单号**，不是数据库自增 ID |
| `data.saas_order_no` | `orderData.order_id \|\| orderData.tracking_number` | 同上，降级到 tracking_number |
| `data.tms_order_id` | `orderData.tms_order_id \|\| null` | TMS 订单 ID（可能为 null） |
| `data.tms_order_no` | `orderData.tms_order_no \|\| orderData.order_no \|\| orderData.tracking_number \|\| null` | TMS 订单号，三级降级 |
| `data.status_label` | `OrderStatusMapper.getStatusInfo(new_status).label` | 中文标签（如"已送达"） |
| `data.status_description` | `OrderStatusMapper.getStatusInfo(new_status).description` | 中文描述 |
| `data.operator` | 操作人信息 `{type, id}` 或 `null` | type 可能是 admin/carrier/customer/system |
| `data.extra_data` | 额外数据或 `{}` | 视具体状态变更而定 |

### 签名算法（`generateSignature()` 已确认）

```javascript
// SaaS 源码 WebhookService.generateSignature()
static generateSignature(payload, secret, timestamp) {
  const signedPayload = `${timestamp}.${payload}`;  // ⚠️ 注意：是 timestamp + "." + payload
  return crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
}
```

**签名内容**：`${timestamp}.${JSON.stringify(payload)}`

**不是**单纯的 JSON body，而是 **时间戳 + 点号 + JSON body** 拼接后签名。

**小蚁侧验证代码：**

```javascript
const crypto = require('crypto');

function verifySaasSignature(headers, body, secretKey) {
  const signature = headers['x-saas-signature'];   // "sha256=xxxxx"
  const timestamp = headers['x-saas-timestamp'];    // "1706000000"

  if (!signature || !timestamp) return false;

  // 1. 检查时间戳 freshness（防止重放攻击，允许 5 分钟偏差）
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  // 2. 计算期望签名
  const payloadString = JSON.stringify(body);
  const signedPayload = `${timestamp}.${payloadString}`;  // ⚠️ 关键：timestamp.payload
  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(signedPayload)
    .digest('hex');

  // 3. 提取签名值（去掉 "sha256=" 前缀）
  const actualSignature = signature.replace('sha256=', '');

  // 4. 安全比对
  try {
    return crypto.timingSafeEqual(
      Buffer.from(actualSignature),
      Buffer.from(expected)
    );
  } catch {
    return false;  // 长度不匹配时 timingSafeEqual 会抛异常
  }
}
```

### SaaS 支持的订单事件（`orderEvents.js` 已确认）

| event_type | 常量名 | 触发时机 | 说明 |
|------------|--------|---------|------|
| `order.created` | `ORDER_CREATED` | 订单创建后 | 新订单产生 |
| `order.status.changed` | `ORDER_STATUS_CHANGED` | 状态变更成功后 | **主要关注此事件** |
| `order.payment.success` | `ORDER_PAYMENT_SUCCESS` | 支付成功后 | 客户完成支付 |
| `order.payment.timeout` | `ORDER_PAYMENT_TIMEOUT` | 支付超时处理时 | 支付超时 |
| `order.cancelled` | `ORDER_CANCELLED` | 订单取消后 | 订单被取消 |
| `order.completed` | `ORDER_COMPLETED` | 订单结算完成后 | 结算完成 |
| `order.assigned` | `ORDER_ASSIGNED` | 客户选择承运商后 | 分配承运商 |
| `order.delivery.started` | `ORDER_DELIVERY_STARTED` | 承运商开始配送 | **车辆出发** |
| `order.delivery.completed` | `ORDER_DELIVERY_COMPLETED` | 承运商完成配送 | **车辆抵达** |
| `order.dispatch.timeout` | `ORDER_DISPATCH_TIMEOUT` | 自动匹配失败或调度超时 | 无人接单 |

> **注意**：`WebhookService.buildPayload()` 中 `event_type` 硬编码为 `'order.status.changed'`，无论触发源是什么事件。所以小蚁侧实际收到的都是 `order.status.changed`，通过 `data.old_status` 和 `data.new_status` 区分具体变更。

### SaaS 的订单状态枚举（`OrderStatusMapper.js` 已确认，共 11 种）

| SaaS 状态 | 中文标签 | 分组 | 颜色 | 描述 |
|-----------|---------|------|------|------|
| `created` | 已创建 | initial | gray | 订单已创建，等待提交 |
| `pending` | 待调度 | processing | blue | 等待平台调度 |
| `pending_claim` | 待接单 | processing | orange | 承运商可接单 |
| `claimed` | 已接单 | processing | cyan | 承运商已接单 |
| `quoted` | 已报价 | processing | purple | 承运商已报价，等待客户选择 |
| `pending_payment` | 待支付 | payment | red | 等待客户支付 |
| `awarded` | 已派单 | delivery | green | 订单已派单，等待承运商配送 |
| `in_transit` | 配送中 | delivery | blue | 承运商正在配送 |
| `delivered` | 已送达 | completed | green | 订单已送达，等待结算 |
| `completed` | 已完成 | final | green | 订单已完成 |
| `cancelled` | 已取消 | final | gray | 订单已取消 |

> **注意**：SaaS 实际只有 **11 种**状态，没有 `exception`（异常）状态。

### SaaS 触发入口（`onOrderStatusChanged()` 已确认）

```javascript
// SaaS 源码 WebhookService.onOrderStatusChanged()
static async onOrderStatusChanged(orderData, oldStatus, newStatus, operator = null, extraData = {}) {
  const eventData = {
    tenant_id: orderData.tenant_id || orderData.customer_tenant_id,
    event_type: 'order.status.changed',
    order_id: orderData.order_id || orderData.id,       // ⚠️ 优先第三方订单号
    order_no: orderData.order_id || orderData.tracking_number,
    tms_order_id: orderData.tms_order_id || null,
    tms_order_no: orderData.tms_order_no || orderData.order_no || orderData.tracking_number || null,
    old_status: oldStatus,
    new_status: newStatus,
    operator: operator,
    extra_data: extraData
  };
  return this.triggerWebhook(eventData);
}
```

**触发流程**：

```
订单状态变更
  → onOrderStatusChanged(orderData, oldStatus, newStatus, operator, extraData)
    → triggerWebhook(eventData)
      → getWebhookConfigs(tenant_id, event_type)   // 查 webhook_configs 表
      → 遍历每个 config:
          → buildPayload(config, eventData)         // 构建回调数据
          → buildHeaders(config, payload)           // 构建请求头 + 签名
          → axios.post(config.target_url, payload)  // 发送 HTTP POST
          → logWebhook(config.id, logData)          // 记录到 webhook_logs 表
          → updateWebhookStats(config.id, success)  // 更新统计
```

---

## 小蚁侧适配方案

### 架构设计

```
SaaS 推送
    │
    ▼
POST /api/v1/webhook/incoming/:platform_code
    │
    ▼
┌─────────────────────────────┐
│  WebhookIncomingController  │  统一入口（static 方法，符合 Controller 规范）
└───────────┬─────────────────┘
            │
            ▼
┌─────────────────────────────┐
│  WebhookAdapterManager      │  适配器注册与路由（static 方法）
├─────────────────────────────┤
│  SaasWebhookAdapter         │  SaaS 专属实现
│  (未来) HuolalaAdapter      │
│  (未来) KuaigouAdapter      │
└───────────┬─────────────────┘
            │
            ▼
┌─────────────────────────────┐
│  Order / IncomingWebhookLog │  Model 层（getTenantConnection + release）
└───────────┬─────────────────┘
            │
            ▼
┌─────────────────────────────┐
│  incoming_webhook_logs      │  记录收到的推送（可观测性）
│  webhook_status_mappings    │  状态映射配置（可运营调整）
└─────────────────────────────┘
```

### 状态映射规则

| SaaS 状态 | SaaS 标签 | → 小蚁状态 | 说明 |
|-----------|----------|-----------|------|
| `created` | 已创建 | `pending` | 新订单 → 待处理 |
| `pending` | 待调度 | `pending` | 等待调度 → 待处理 |
| `pending_claim` | 待接单 | `pending` | 承运商可接单 → 待处理 |
| `claimed` | 已接单 | `assigned` | 承运商已接单 → 已分配 |
| `quoted` | 已报价 | `assigned` | 已报价等待选择 → 已分配 |
| `pending_payment` | 待支付 | `assigned` | 等待支付 → 已分配（等待中） |
| `awarded` | 已派单 | `assigned` | 已派单等待配送 → 已分配 |
| `in_transit` | 配送中 | `in_progress` | 承运商正在配送 → 进行中（**车辆出发**） |
| `delivered` | 已送达 | `completed` | 订单已送达 → 已完成（**车辆抵达**） |
| `completed` | 已完成 | `completed` | 订单已完成 → 已完成 |
| `cancelled` | 已取消 | `cancelled` | 订单已取消 → 已取消 |

> **注意**：映射规则存储在 `webhook_status_mappings` 表中，运营可在管理后台调整，无需改代码。

### 签名验证（已对照 SaaS 源码确认）

```javascript
const crypto = require('crypto');

/**
 * 验证 SaaS Webhook 签名
 *
 * SaaS 签名算法：HMAC-SHA256(secret, "${timestamp}.${jsonBody}")
 * 签名结果放在请求头 X-SaaS-Signature: sha256=<hex>
 *
 * @param {Object} headers - 请求头
 * @param {Object} body - 解析后的 JSON body
 * @param {string} secretKey - webhook_configs.secret_key
 * @returns {boolean}
 */
function verifySaasSignature(headers, body, secretKey) {
  const signature = headers['x-saas-signature'];   // "sha256=xxxxx"
  const timestamp = headers['x-saas-timestamp'];    // "1706000000"

  if (!signature || !timestamp) return false;

  // 1. 检查时间戳 freshness（防止重放攻击，允许 5 分钟偏差）
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  // 2. 计算期望签名
  //    SaaS 源码：const signedPayload = `${timestamp}.${payload}`;
  const payloadString = JSON.stringify(body);
  const signedPayload = `${timestamp}.${payloadString}`;
  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(signedPayload)
    .digest('hex');

  // 3. 提取签名值（去掉 "sha256=" 前缀）
  const actualSignature = signature.replace('sha256=', '');

  // 4. 安全比对（防止时序攻击）
  try {
    return crypto.timingSafeEqual(
      Buffer.from(actualSignature),
      Buffer.from(expected)
    );
  } catch {
    return false;  // 长度不匹配时 timingSafeEqual 会抛异常
  }
}
```

### 订单关联

SaaS 推送数据中的订单标识字段：

| 推送字段 | 取值来源（SaaS 源码） | 说明 |
|---------|---------------------|------|
| `data.saas_order_id` | `orderData.order_id \|\| orderData.id` | 优先第三方订单号 |
| `data.saas_order_no` | `orderData.order_id \|\| orderData.tracking_number` | 同上 |
| `data.tms_order_id` | `orderData.tms_order_id \|\| null` | TMS 订单 ID |
| `data.tms_order_no` | `orderData.tms_order_no \|\| orderData.order_no \|\| orderData.tracking_number \|\| null` | TMS 订单号 |

查找逻辑（按优先级）：

```javascript
// 复用现有 Order.findByThirdPartyOrderNo() 方法
// 该方法已存在于 backend/models/Order.js

// 1. 优先用 tms_order_no 查找（如果小蚁创建订单时传了 third_party_order_no）
let order = await Order.findByThirdPartyOrderNo(payload.data.tms_order_no, tenantCode);

// 2. 降级用 saas_order_id 查找
if (!order && payload.data.saas_order_id) {
  order = await Order.findByThirdPartyOrderNo(payload.data.saas_order_id, tenantCode);
}

// 3. 降级用 saas_order_no 查找
if (!order && payload.data.saas_order_no) {
  order = await Order.findByThirdPartyOrderNo(payload.data.saas_order_no, tenantCode);
}
```

---

## 数据库变更

> **规范要求**（skills 第 4.3 节）：数据库 DDL 变更必须同步更新 `docs/database/schema.sql`。

### 新增表：`webhook_status_mappings`（状态映射配置）

```sql
CREATE TABLE IF NOT EXISTS webhook_status_mappings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  platform_code VARCHAR(50) NOT NULL COMMENT '平台编码，如 saas/huolala',
  external_status VARCHAR(50) NOT NULL COMMENT '外部系统状态值',
  external_label VARCHAR(100) COMMENT '外部系统状态中文标签',
  internal_status VARCHAR(50) NOT NULL COMMENT '小蚁内部状态值',
  description VARCHAR(200) COMMENT '说明',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '软删除',
  UNIQUE KEY uk_platform_external (platform_code, external_status)
) COMMENT='Webhook 状态映射配置表';
```

初始数据（11 条，覆盖 SaaS 全部状态）：

```sql
INSERT INTO webhook_status_mappings (platform_code, external_status, external_label, internal_status, description) VALUES
('saas', 'created',         '已创建', 'pending',     'SaaS 已创建 → 待处理'),
('saas', 'pending',         '待调度', 'pending',     'SaaS 待调度 → 待处理'),
('saas', 'pending_claim',   '待接单', 'pending',     'SaaS 待接单 → 待处理'),
('saas', 'claimed',         '已接单', 'assigned',    'SaaS 已接单 → 已分配'),
('saas', 'quoted',          '已报价', 'assigned',    'SaaS 已报价 → 已分配'),
('saas', 'pending_payment', '待支付', 'assigned',    'SaaS 待支付 → 已分配'),
('saas', 'awarded',         '已派单', 'assigned',    'SaaS 已派单 → 已分配'),
('saas', 'in_transit',      '配送中', 'in_progress', 'SaaS 配送中 → 进行中'),
('saas', 'delivered',       '已送达', 'completed',   'SaaS 已送达 → 已完成'),
('saas', 'completed',       '已完成', 'completed',   'SaaS 已完成 → 已完成'),
('saas', 'cancelled',       '已取消', 'cancelled',   'SaaS 已取消 → 已取消');
```

### 新增表：`incoming_webhook_logs`（接收日志）

```sql
CREATE TABLE IF NOT EXISTS incoming_webhook_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  platform_code VARCHAR(50) NOT NULL COMMENT '来源平台编码',
  event_type VARCHAR(100) NOT NULL COMMENT '事件类型',
  event_id VARCHAR(100) COMMENT 'SaaS 事件 ID（X-SaaS-Event-ID）',
  raw_body TEXT NOT NULL COMMENT '原始请求体',
  mapped_order_id INT COMMENT '关联的小蚁订单 ID',
  external_order_no VARCHAR(100) COMMENT '外部订单号（saas_order_id 或 tms_order_no）',
  external_old_status VARCHAR(50) COMMENT '变更前状态',
  external_new_status VARCHAR(50) COMMENT '变更后状态',
  mapped_status VARCHAR(50) COMMENT '映射后的内部状态',
  processing_status ENUM('success', 'failed', 'ignored') DEFAULT 'success' COMMENT '处理结果',
  error_message TEXT COMMENT '错误信息',
  signature_valid TINYINT(1) DEFAULT 0 COMMENT '签名是否验证通过',
  response_time_ms INT COMMENT '处理耗时（毫秒）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_platform (platform_code),
  INDEX idx_order (mapped_order_id),
  INDEX idx_event_id (event_id),
  INDEX idx_created (created_at)
) COMMENT='外部 Webhook 接收日志表';
```

### 扩展表：`third_party_platforms`

```sql
-- 新增 adapter_class 字段（标识使用哪个适配器类）
ALTER TABLE third_party_platforms
ADD COLUMN adapter_class VARCHAR(100) DEFAULT NULL
  COMMENT '适配器类名，如 SaasWebhookAdapter' AFTER callback_url;
```

> **设计说明**：`third_party_platforms` 表当前由 `ThirdPartyPlatform` 模型通过 `getTenantConnection('global')` 访问（全局共享），新增的 `adapter_class` 字段保持这一模式，不引入 `tenant_code`。租户关联通过 `webhook_status_mappings` 的 `platform_code` 区分。

### 同步更新 `docs/database/schema.sql`

> **⚠️ 必须**：以上 DDL 变更必须同步追加到 `docs/database/schema.sql` 文件末尾，保持 schema 文件与实际数据库一致（skills 第 4.3 节要求）。

---

## OpenAPI 变更（API-First）

> **⚠️ 规范要求**（skills 第 5.2 节）：**先更新 `openapi/` 模块文件，再写代码**。新增 API 必须在模块化目录中定义。

### 新增 Tag

在 `openapi/openapi.yaml` 的 `tags` 列表中新增：

```yaml
- name: Webhook
  description: 外部平台 Webhook 接收端点
```

### 新增路径文件

创建 `openapi/paths/webhook.yaml`：

```yaml
# ============================================================
# Webhook 接收路径 - Webhook（1 端点）
# 模块: webhook
# ============================================================

paths:
  /v1/webhook/incoming/{platform_code}:
    post:
      summary: 接收外部平台 Webhook 推送
      description: |
        统一的外部 Webhook 接收入口。不同平台通过 path 参数 platform_code 区分。
        请求需携带平台分配的签名信息（各平台签名算法不同）。
        即使订单不存在或处理失败，也返回 HTTP 200 避免推送方重试。
      tags:
        - Webhook
      parameters:
        - name: platform_code
          in: path
          required: true
          schema:
            type: string
            example: saas
          description: 平台编码（如 saas、huolala）
        - name: X-API-Key
          in: header
          required: true
          schema:
            type: string
          description: 平台分配的 API Key
        - name: X-SaaS-Signature
          in: header
          required: true
          schema:
            type: string
            example: sha256=a1b2c3d4...
          description: HMAC-SHA256 签名（SaaS 平台）
        - name: X-SaaS-Timestamp
          in: header
          required: true
          schema:
            type: string
          description: Unix 秒级时间戳（SaaS 平台）
        - name: X-SaaS-Event-ID
          in: header
          schema:
            type: string
          description: 事件唯一 ID（SaaS 平台）
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '../components/schemas/webhook.yaml#/WebhookIncomingPayload'
      responses:
        '200':
          description: 已接收（无论处理成功与否均返回 200）
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  message:
                    type: string
                example:
                  success: true
                  message: 已接收
        '401':
          description: 签名验证失败
          content:
            application/json:
              schema:
                $ref: '../components/schemas/common.yaml#/ErrorResponse'
              example:
                success: false
                message: 签名验证失败
        '404':
          description: 平台未注册
          content:
            application/json:
              schema:
                $ref: '../components/schemas/common.yaml#/ErrorResponse'
              example:
                success: false
                message: 平台未注册
```

### 新增 Schema 文件

创建 `openapi/components/schemas/webhook.yaml`：

```yaml
# ============================================================
# Webhook 模块 Schema - WebhookIncomingPayload / WebhookStatusMapping / IncomingWebhookLog
# 模块: webhook
# ============================================================

WebhookIncomingPayload:
  type: object
  required:
    - event_type
    - data
  properties:
    event_type:
      type: string
      description: 事件类型
      example: order.status.changed
    event_time:
      type: string
      format: date-time
      description: 事件发生时间
    data:
      type: object
      required:
        - new_status
      properties:
        saas_order_id:
          type: string
          description: SaaS 订单 ID（优先第三方订单号）
        saas_order_no:
          type: string
          description: SaaS 订单号
        tms_order_id:
          type: string
          nullable: true
          description: TMS 订单 ID
        tms_order_no:
          type: string
          nullable: true
          description: TMS 订单号
        old_status:
          type: string
          description: 变更前状态
        new_status:
          type: string
          description: 变更后状态
        status_label:
          type: string
          description: 状态中文标签
        status_description:
          type: string
          description: 状态中文描述
        operator:
          type: object
          nullable: true
          properties:
            type:
              type: string
            id:
              type: integer
        extra_data:
          type: object
          description: 额外数据

WebhookStatusMapping:
  type: object
  properties:
    id:
      type: integer
    platform_code:
      type: string
    external_status:
      type: string
    external_label:
      type: string
    internal_status:
      type: string
    description:
      type: string
    created_at:
      type: string
      format: date-time
    updated_at:
      type: string
      format: date-time

IncomingWebhookLog:
  type: object
  properties:
    id:
      type: integer
    platform_code:
      type: string
    event_type:
      type: string
    event_id:
      type: string
    raw_body:
      type: string
    mapped_order_id:
      type: integer
      nullable: true
    external_order_no:
      type: string
    external_old_status:
      type: string
    external_new_status:
      type: string
    mapped_status:
      type: string
      nullable: true
    processing_status:
      type: string
      enum: [success, failed, ignored]
    error_message:
      type: string
      nullable: true
    signature_valid:
      type: boolean
    response_time_ms:
      type: integer
    created_at:
      type: string
      format: date-time
```

### 在主入口注册 $ref

在 `openapi/openapi.yaml` 中追加：

```yaml
# paths 部分追加
paths:
  /v1/webhook/incoming/{platform_code}:
    $ref: './paths/webhook.yaml#/paths/~1v1~1webhook~1incoming~1{platform_code}'

# components/schemas 部分追加
components:
  schemas:
    WebhookIncomingPayload:
      $ref: './components/schemas/webhook.yaml#/WebhookIncomingPayload'
    WebhookStatusMapping:
      $ref: './components/schemas/webhook.yaml#/WebhookStatusMapping'
    IncomingWebhookLog:
      $ref: './components/schemas/webhook.yaml#/IncomingWebhookLog'
```

---

## 代码变更清单

### 新增文件

| 文件 | 说明 | 规范对齐 |
|------|------|---------|
| `backend/controllers/WebhookIncomingController.js` | 统一接收入口 | static 方法 + try/catch + 统一响应格式 |
| `backend/services/webhook/WebhookAdapterManager.js` | 适配器注册与路由 | static 方法 |
| `backend/services/webhook/SaasWebhookAdapter.js` | SaaS 适配器实现 | verifySignature / mapStatus / transformPayload |
| `backend/models/WebhookStatusMapping.js` | 状态映射模型 | getTenantConnection('global') + release |
| `backend/models/IncomingWebhookLog.js` | 接收日志模型 | getTenantConnection('global') + release |
| `scripts/migrations/001_add_webhook_tables.sql` | 数据库迁移脚本 | 放在 scripts/ 目录（不放根目录） |

### 修改文件

| 文件 | 变更 | 规范对齐 |
|------|------|---------|
| `openapi/paths/webhook.yaml` + `openapi/components/schemas/webhook.yaml` + `openapi/openapi.yaml` | 新增 Webhook 路径 + Schema + $ref 注册 | **API-First**（skills 第 5.2 节） |
| `backend/routes/v1.js` | 新增 `/webhook/incoming/:platform_code` 路由 | 注释块分组 + 无 tenant 中间件 |
| `backend/models/ThirdPartyPlatform.js` | 支持 `adapter_class` 字段 | 构造函数映射新字段 |
| `docs/database/schema.sql` | 追加新表 DDL | skills 第 4.3 节要求 |
| `backend/middleware/tenant.js` | webhook incoming 路由豁免 | 与 `/payments/callback` 同级豁免 |

### 不需要改动的文件

| 文件 | 原因 |
|------|------|
| `backend/controllers/ThirdPartyOrderController.js` | 第三方主动调用的 API 不变 |
| `backend/services/CallbackService.js` | 小蚁对外回调的逻辑不变 |
| `backend/models/Order.js` | 订单模型不变，复用现有 `findByThirdPartyOrderNo` |
| `backend/models/OrderCallback.js` | 发出的回调日志不变 |
| `backend/server.js` | v1 路由已注册，无需改动 |

---

## 代码实现规范（对齐 skills）

### Controller 实现（`WebhookIncomingController.js`）

```javascript
// backend/controllers/WebhookIncomingController.js
const WebhookAdapterManager = require('../services/webhook/WebhookAdapterManager');
const IncomingWebhookLog = require('../models/IncomingWebhookLog');

class WebhookIncomingController {
  /**
   * 接收外部平台 Webhook 推送
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  static async receive(req, res) {
    const startTime = Date.now();
    const { platform_code } = req.params;

    try {
      // 1. 查找平台配置
      const platform = await WebhookAdapterManager.getPlatform(platform_code);
      if (!platform) {
        return res.status(404).json({
          success: false,
          message: '平台未注册'
        });
      }

      // 2. 获取适配器
      const adapter = WebhookAdapterManager.getAdapter(platform);
      if (!adapter) {
        return res.status(404).json({
          success: false,
          message: '平台适配器未配置'
        });
      }

      // 3. 验证签名
      const isValid = adapter.verifySignature(req.headers, req.body, platform.api_secret);
      if (!isValid) {
        // 记录签名失败的日志
        await IncomingWebhookLog.create({
          platform_code,
          event_type: req.body.event_type || 'unknown',
          event_id: req.headers['x-saas-event-id'] || null,
          raw_body: JSON.stringify(req.body),
          signature_valid: 0,
          processing_status: 'failed',
          error_message: '签名验证失败',
          response_time_ms: Date.now() - startTime
        });

        return res.status(401).json({
          success: false,
          message: '签名验证失败'
        });
      }

      // 4. 处理推送数据
      const result = await adapter.handlePayload(req.body, platform);

      // 5. 记录日志
      await IncomingWebhookLog.create({
        platform_code,
        event_type: req.body.event_type || 'unknown',
        event_id: req.headers['x-saas-event-id'] || null,
        raw_body: JSON.stringify(req.body),
        mapped_order_id: result.orderId || null,
        external_order_no: result.externalOrderNo || null,
        external_old_status: result.oldStatus || null,
        external_new_status: result.newStatus || null,
        mapped_status: result.mappedStatus || null,
        processing_status: result.status,
        error_message: result.error || null,
        signature_valid: 1,
        response_time_ms: Date.now() - startTime
      });

      // 6. 始终返回 200（避免推送方重试）
      return res.status(200).json({
        success: true,
        message: result.message || '已接收'
      });
    } catch (error) {
      console.error('WebhookIncomingController.receive error:', error);

      // 即使内部错误也返回 200，记录日志
      try {
        await IncomingWebhookLog.create({
          platform_code,
          event_type: req.body?.event_type || 'unknown',
          raw_body: JSON.stringify(req.body),
          processing_status: 'failed',
          error_message: error.message,
          signature_valid: 1,
          response_time_ms: Date.now() - startTime
        });
      } catch (logError) {
        console.error('WebhookIncomingController.receive logError:', logError);
      }

      return res.status(200).json({
        success: true,
        message: '已接收，处理异常已记录'
      });
    }
  }
}

module.exports = WebhookIncomingController;
```

**规范对齐点**：
- ✅ static 方法（skills 第 2.2 节）
- ✅ try/catch 包裹（skills 第 2.2 节）
- ✅ 错误日志格式 `ControllerName.methodName error:`（skills 第 2.2 节）
- ✅ 统一响应格式 `{ success, message }`（skills 第 5.4 节）
- ✅ HTTP 状态码：401 签名失败、404 平台未注册、200 成功接收（skills 第 6.1 节）

### Model 实现（`IncomingWebhookLog.js`）

```javascript
// backend/models/IncomingWebhookLog.js
const { getTenantConnection } = require('../middleware/tenant');

class IncomingWebhookLog {
  static tableName = 'incoming_webhook_logs';

  constructor(data = {}) {
    this.id = data.id;
    this.platform_code = data.platform_code;
    this.event_type = data.event_type;
    this.event_id = data.event_id;
    this.raw_body = data.raw_body;
    this.mapped_order_id = data.mapped_order_id;
    this.external_order_no = data.external_order_no;
    this.external_old_status = data.external_old_status;
    this.external_new_status = data.external_new_status;
    this.mapped_status = data.mapped_status;
    this.processing_status = data.processing_status;
    this.error_message = data.error_message;
    this.signature_valid = data.signature_valid;
    this.response_time_ms = data.response_time_ms;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 创建接收日志
   * @param {object} logData - 日志数据
   * @returns {IncomingWebhookLog}
   */
  static async create(logData) {
    // Webhook 日志是全局的，不区分租户
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName}
         (platform_code, event_type, event_id, raw_body, mapped_order_id,
          external_order_no, external_old_status, external_new_status,
          mapped_status, processing_status, error_message, signature_valid, response_time_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logData.platform_code, logData.event_type, logData.event_id || null,
          logData.raw_body, logData.mapped_order_id || null,
          logData.external_order_no || null,
          logData.external_old_status || null, logData.external_new_status || null,
          logData.mapped_status || null, logData.processing_status || 'success',
          logData.error_message || null, logData.signature_valid ? 1 : 0,
          logData.response_time_ms || null
        ]
      );
      return new IncomingWebhookLog({ ...logData, id: result.insertId });
    } finally {
      connection.release();  // 必须释放连接（skills 第 4.1 节）
    }
  }

  /**
   * 按平台查日志
   * @param {string} platformCode - 平台编码
   * @param {object} options - { page, pageSize }
   * @returns {object} { logs, pagination }
   */
  static async findByPlatform(platformCode, options = {}) {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const page = options.page || 1;
      const pageSize = options.pageSize || 20;
      const offset = (page - 1) * pageSize;

      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName}
         WHERE platform_code = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [platformCode, pageSize, offset]
      );

      const [countRows] = await connection.execute(
        `SELECT COUNT(*) as total FROM ${this.tableName} WHERE platform_code = ?`,
        [platformCode]
      );

      return {
        logs: rows.map(row => new IncomingWebhookLog(row)),
        pagination: {
          page,
          pageSize,
          total: countRows[0].total
        }
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = IncomingWebhookLog;
```

**规范对齐点**：
- ✅ `getTenantConnection('global')` 获取连接池（skills 第 4.1 节）
- ✅ `finally { connection.release() }` 释放连接（skills 第 4.1 节）
- ✅ 参数化查询 `?` 占位符（skills 第 4.2 节）
- ✅ 构造函数映射数据库字段（skills 第 2.3 节）
- ✅ static 方法（skills 第 2.3 节）

### Model 实现（`WebhookStatusMapping.js`）

```javascript
// backend/models/WebhookStatusMapping.js
const { getTenantConnection } = require('../middleware/tenant');

class WebhookStatusMapping {
  static tableName = 'webhook_status_mappings';

  constructor(data = {}) {
    this.id = data.id;
    this.platform_code = data.platform_code;
    this.external_status = data.external_status;
    this.external_label = data.external_label;
    this.internal_status = data.internal_status;
    this.description = data.description;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 查找指定平台+外部状态的映射
   * @param {string} platformCode - 平台编码
   * @param {string} externalStatus - 外部状态值
   * @returns {WebhookStatusMapping|null}
   */
  static async findMapping(platformCode, externalStatus) {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName}
         WHERE platform_code = ? AND external_status = ? AND deleted_at IS NULL`,
        [platformCode, externalStatus]
      );
      return rows.length > 0 ? new WebhookStatusMapping(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 查找指定平台的所有映射
   * @param {string} platformCode - 平台编码
   * @returns {WebhookStatusMapping[]}
   */
  static async findByPlatform(platformCode) {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName}
         WHERE platform_code = ? AND deleted_at IS NULL
         ORDER BY id ASC`,
        [platformCode]
      );
      return rows.map(row => new WebhookStatusMapping(row));
    } finally {
      connection.release();
    }
  }
}

module.exports = WebhookStatusMapping;
```

### 路由注册（`v1.js` 变更）

```javascript
// backend/routes/v1.js 新增部分

// ======================
// Webhook 接收 API
// ======================
const WebhookIncomingController = require('../controllers/WebhookIncomingController');

// Webhook 推送入口（不使用 apiKeyAuth，签名由适配器自行验证）
router.post('/webhook/incoming/:platform_code', WebhookIncomingController.receive);
```

**规范对齐点**：
- ✅ 注释块分组（skills 第 2.4 节）
- ✅ RESTful 风格（skills 第 2.4 节）
- ✅ 不使用 `apiKeyAuth` 中间件（Webhook 签名由适配器验证，不走 API Key 认证）
- ✅ 需在 `tenant.js` 中将 `/v1/webhook/` 加入租户中间件豁免列表

### 租户中间件豁免（`tenant.js` 变更）

```javascript
// backend/middleware/tenant.js 豁免列表新增
// 现有豁免：/auth/, /admin/, /images/, /payments/callback
// 新增豁免：/v1/webhook/incoming/
const exemptPaths = ['/auth/', '/admin/', '/images/', '/payments/callback', '/v1/webhook/incoming/'];
```

> **原因**：Webhook 推送来自外部 SaaS，不携带 `x-tenant-code` 请求头，也不走 JWT 认证。租户识别通过 `third_party_platforms` 表的配置隐式关联。

---

## API 端点

### 接收 SaaS Webhook（新增）

```
POST /api/v1/webhook/incoming/:platform_code
```

**路径参数：**

| 参数 | 说明 |
|------|------|
| `platform_code` | 平台编码，如 `saas` |

**请求头（SaaS 推送，已确认）：**

```
Content-Type: application/json
X-API-Key: <webhook_configs.api_key>
X-SaaS-Signature: sha256<HMAC-SHA256(secret, "${timestamp}.${jsonBody}")>
X-SaaS-Timestamp: <unix秒级时间戳>
X-SaaS-Event-ID: evt_<timestamp>_<随机字符串>
```

**响应（统一格式，skills 第 5.4 节）：**

```json
// 成功
{ "success": true, "message": "已接收" }

// 订单不存在（记录日志但不报错）
{ "success": true, "message": "已接收，订单未关联" }

// 签名验证失败
{ "success": false, "message": "签名验证失败" }

// 平台未注册
{ "success": false, "message": "平台未注册" }
```

> **设计原则**：即使订单不存在或状态映射失败，也返回 HTTP 200，避免 SaaS 侧反复重试。错误记录在 `incoming_webhook_logs` 中供排查。仅签名失败（401）和平台未注册（404）返回非 200。

---

## 对接流程（端到端）

### 步骤 1：SaaS 侧配置 Webhook

SaaS 平台管理员通过管理 API 配置 Webhook：

```bash
POST https://api.ifyes.top/api/webhook/configs
Authorization: Bearer <admin_token>

{
  "tenant_id": 3,
  "name": "小蚁搬运-状态同步",
  "event_type": "order.status.changed",
  "target_url": "https://api.xiaoyibanyun.com/api/v1/webhook/incoming/saas",
  "api_key": "saas_api_key_xxx",
  "secret_key": "saas_api_secret_xxx",
  "timeout_seconds": 30,
  "retry_count": 3,
  "is_active": 1
}
```

### 步骤 2：小蚁侧配置

1. 在 `third_party_platforms` 表注册 SaaS 平台：

```sql
INSERT INTO third_party_platforms (name, code, api_key, api_secret, callback_url, adapter_class, status)
VALUES (
  '数孪智运 SaaS',
  'saas',
  'saas_api_key_xxx',
  'saas_api_secret_xxx',
  NULL,
  'SaasWebhookAdapter',
  1
);
```

2. 确认 `webhook_status_mappings` 表已有 SaaS 的映射规则（见上方 SQL）

### 步骤 3：小蚁通过 SaaS TMS API 创建订单

```bash
POST https://api.ifyes.top/api/tms/orders
X-Api-Key: <tms_api_key>

{
  "customer_name": "张三",
  "phone": "13800138000",
  "address": "上海市浦东新区xxx",
  "amount": 280.00,
  "third_party_order_no": "XY2607261015001"
}
```

SaaS 创建订单后，`orderData.order_id` 会被设为 `XY2607261015001`（第三方订单号）。

### 步骤 4：SaaS 推送状态变更（车辆出发）

SaaS 订单状态变为 `in_transit`（车辆出发），触发 `onOrderStatusChanged()`：

```json
{
  "event_type": "order.status.changed",
  "event_time": "2026-07-26T10:30:00.000Z",
  "data": {
    "saas_order_id": "XY2607261015001",
    "saas_order_no": "XY2607261015001",
    "tms_order_id": null,
    "tms_order_no": "XY2607261015001",
    "old_status": "awarded",
    "new_status": "in_transit",
    "status_label": "配送中",
    "status_description": "承运商正在配送",
    "operator": { "type": "carrier", "id": 7 },
    "extra_data": {}
  }
}
```

请求头：

```
X-API-Key: saas_api_key_xxx
X-SaaS-Signature: sha256=a1b2c3d4...
X-SaaS-Timestamp: 1753510200
X-SaaS-Event-ID: evt_1753510200_abc123def
```

小蚁处理：
1. 验证签名 ✅（`HMAC-SHA256(secret, "1753510200.{json}")` → 比对 `a1b2c3d4...`）
2. 查找 `third_party_order_no = 'XY2607261015001'` 的订单 ✅
3. 映射 `in_transit` → `in_progress` ✅
4. 更新订单状态为 `in_progress` ✅
5. 记录日志到 `incoming_webhook_logs` ✅
6. 返回 `{ "success": true, "message": "已接收" }` ✅

### 步骤 5：SaaS 推送车辆抵达

SaaS 订单状态变为 `delivered`（车辆抵达）：

```json
{
  "event_type": "order.status.changed",
  "event_time": "2026-07-26T11:00:00.000Z",
  "data": {
    "saas_order_id": "XY2607261015001",
    "saas_order_no": "XY2607261015001",
    "tms_order_id": null,
    "tms_order_no": "XY2607261015001",
    "old_status": "in_transit",
    "new_status": "delivered",
    "status_label": "已送达",
    "status_description": "订单已送达，等待结算",
    "operator": { "type": "carrier", "id": 7 },
    "extra_data": {
      "carrier_id": 7,
      "complete_time": "2026-07-26T11:00:00.000Z"
    }
  }
}
```

小蚁处理：映射 `delivered` → `completed`，更新订单，记录日志。

---

## 错误处理与重试

### 小蚁侧处理策略（对齐 skills 第 6 节）

| 场景 | HTTP 状态码 | 处理方式 | 响应 |
|------|-----------|---------|------|
| 签名验证失败 | `401` | 记录日志（`signature_valid=0`），不处理 | `{ success: false, message: '签名验证失败' }` |
| 平台未注册 | `404` | 记录日志，不处理 | `{ success: false, message: '平台未注册' }` |
| 订单不存在 | `200` | 记录日志（`mapped_order_id=NULL`），不报错 | `{ success: true, message: '已接收，订单未关联' }` |
| 状态映射不存在 | `200` | 记录日志（`mapped_status=NULL`），不更新 | `{ success: true, message: '已接收，状态未映射' }` |
| 状态回退（如 delivered→pending） | `200` | 忽略，不更新 | `{ success: true, message: '已接收，状态回退忽略' }` |
| 处理成功 | `200` | 更新订单，记录日志 | `{ success: true, message: '已接收' }` |
| 服务器内部错误 | `200` | 记录日志 + catch 块处理 | `{ success: true, message: '已接收，处理异常已记录' }` |

> **设计原则**：除签名失败和平台未注册外，一律返回 200。错误详情记录在 `incoming_webhook_logs` 表中供排查。

### SaaS 侧重试策略

SaaS 的 `webhook_configs` 配置了 `retry_count=3`、`retry_interval_seconds=60`。推送失败时会重试。小蚁侧应始终返回 HTTP 200 表示「已接收」，避免不必要的重试。

SaaS 侧的推送日志记录在 `webhook_logs` 表中，包含完整的请求/响应信息。

---

## 管理后台功能（可选，后续迭代）

> **规范提醒**：如需在管理后台新增页面，必须遵循 skills 第 8 节的三栏布局、侧边栏规范、hash 路由等约定。

### 推送日志查看

在管理后台（总后台 `#webhook-logs`）新增页面，展示 `incoming_webhook_logs` 数据：

- 按平台筛选
- 按时间范围筛选
- 查看原始推送数据
- 查看处理结果（成功/失败/忽略）
- 手动重新处理失败的推送

侧边栏项：

```html
<li class="nav-item">
  <a class="nav-link" href="#webhook-logs">
    <i class="fas fa-webhook me-2"></i>推送日志
  </a>
</li>
```

### 状态映射管理

在管理后台（总后台 `#webhook-mappings`）新增页面，管理 `webhook_status_mappings` 数据：

- 查看当前映射规则
- 新增/修改/删除映射
- 批量导入映射规则

---

## 新增模块 Checklist（skills 第 9 节）

实施开发前必须完成以下步骤：

- [x] 在 `openapi/paths/webhook.yaml` 中定义接口路径（API-First）
- [x] 在 `openapi/components/schemas/webhook.yaml` 中定义数据模型
- [x] 在 `openapi/openapi.yaml` 中注册 $ref 引用
- [x] 创建 Model — `IncomingWebhookLog.js`、`WebhookStatusMapping.js`
- [x] 创建 Controller — `WebhookIncomingController.js`
- [x] 创建 Webhook 适配器 — `WebhookAdapterManager.js`、`SaasWebhookAdapter.js`
- [x] 在对应路由文件中注册路由 — `backend/routes/v1.js`
- [x] 新增表更新 `docs/database/schema.sql` — `webhook_status_mappings`、`incoming_webhook_logs`
- [x] 租户中间件豁免 — `tenant.js` 添加 `/v1/webhook/incoming/` 豁免
- [x] 创建数据库迁移脚本 — `scripts/migrations/001_add_webhook_tables.sql`
- [x] 执行数据库迁移 — 2 新表 + 1 新字段 + 11 条 SaaS 状态映射
- [x] 注册 SaaS 平台 — `third_party_platforms` 表（code=saas, adapter=SaasWebhookAdapter）
- [x] 验证 `npm run validate-api` 通过
- [x] 验证 `npm run validate-skills` 通过
- [x] 端到端测试 — 404/401/200 场景全部通过，日志写入正常
- [ ] 管理后台如需页面，创建对应 HTML — 后续迭代
- [ ] 生产环境部署 — rsync 代码 + 执行迁移 + 更换正式密钥
- [ ] 端到端联调 — 用真实订单测试状态变更推送

---

## 实施记录（2026-07-26）

### 已完成工作

#### 1. OpenAPI 模块化文件

| 文件 | 说明 |
|------|------|
| `openapi/paths/webhook.yaml` | Webhook 路径定义（1 端点） |
| `openapi/components/schemas/webhook.yaml` | 3 个 Schema（WebhookIncomingPayload / WebhookStatusMapping / IncomingWebhookLog） |
| `openapi/openapi.yaml` | 注册 Webhook tag + path $ref + 3 个 schema $ref |

#### 2. 后端代码

| 文件 | 说明 |
|------|------|
| `backend/controllers/WebhookIncomingController.js` | 统一接收入口 |
| `backend/services/webhook/WebhookAdapterManager.js` | 适配器注册与路由 |
| `backend/services/webhook/SaasWebhookAdapter.js` | SaaS 签名验证 + 状态映射 + 订单关联 |
| `backend/models/IncomingWebhookLog.js` | 接收日志模型 |
| `backend/models/WebhookStatusMapping.js` | 状态映射模型 |
| `backend/models/ThirdPartyPlatform.js` | 新增 `adapter_class` 字段映射 |
| `backend/routes/v1.js` | 新增 webhook 路由 + 租户中间件豁免 |
| `backend/middleware/tenant.js` | 豁免 `/v1/webhook/incoming/` |

#### 3. 数据库

| 变更 | 说明 |
|------|------|
| `webhook_status_mappings` 表 | 状态映射配置表（已创建） |
| `incoming_webhook_logs` 表 | 接收日志表（已创建） |
| `third_party_platforms.adapter_class` | 适配器类名字段（已添加） |
| SaaS 状态映射 | 11 条初始数据（已插入） |
| `docs/database/schema.sql` | 同步更新 DDL |

#### 4. 迁移脚本

| 文件 | 说明 |
|------|------|
| `scripts/migrations/001_add_webhook_tables.sql` | 完整迁移脚本（2 表 + 1 字段 + 初始数据） |

#### 5. 平台注册

```sql
-- 已注册 SaaS 平台（测试密钥，上线前需更换）
INSERT INTO third_party_platforms (name, code, api_key, api_secret, adapter_class, status)
VALUES ('数孪智运 SaaS', 'saas', 'saas_api_key_test', 'saas_api_secret_test', 'SaasWebhookAdapter', 1);
```

#### 6. 验证结果

| 验证项 | 结果 |
|--------|------|
| `node -c` 语法检查 | ✅ 8/8 通过 |
| `npm run validate-api` | ✅ valid |
| `npm run validate-skills:quiet` | ✅ 通过（0 错误） |
| 端到端测试：404 平台未注册 | ✅ |
| 端到端测试：401 签名失败 | ✅ |
| 端到端测试：200 订单不存在 | ✅ |
| 日志写入 DB | ✅ |

### 待完成工作

| 任务 | 优先级 | 说明 |
|------|--------|------|
| 端到端联调 | 高 | 用真实订单测试状态变更推送 |
| 生产部署 | 高 | rsync 代码 + 执行迁移 + 更换正式密钥 |
| 管理后台页面 | 低 | Webhook 推送日志查看 + 状态映射管理 |

---

## 未来扩展

### 新增第三方平台

只需 3 步：

1. **写适配器**：创建 `XxxWebhookAdapter.js`，实现 `verifySignature()` / `mapStatus()` / `transformPayload()`
2. **注册平台**：`INSERT INTO third_party_platforms ...`（含 `adapter_class` 字段）
3. **配置映射**：`INSERT INTO webhook_status_mappings ...`

无需改动核心代码、无需改 OpenAPI 结构、无需改数据库表结构。

### 可能的扩展方向

| 扩展 | 说明 |
|------|------|
| 双向同步 | 小蚁状态变更也推送给 SaaS（复用现有 CallbackService） |
| 车辆位置同步 | SaaS 推送车辆实时位置，小蚁展示在地图上 |
| 电子围栏触发 | 车辆进入围栏范围自动触发状态变更 |
| 多租户隔离 | 不同租户接收不同 SaaS 的推送 |

---

## 附录 A：SaaS 侧源码参考

| 文件 | 路径 | 说明 |
|------|------|------|
| WebhookService | `backend/services/WebhookService.js` | 核心推送服务（buildPayload/buildHeaders/generateSignature/onOrderStatusChanged） |
| OrderPushService | `backend/services/OrderPushService.js` | 继承 WebhookService，支持适配器模式（Neolix/Jiushi） |
| 事件定义 | `backend/core/events/orderEvents.js` | 10 种订单事件常量 |
| 状态映射 | `backend/services/OrderStatusMapper.js` | 11 种状态配置（label/color/description/group） |
| 配置表迁移 | `backend/db/migrations/020_create_webhook_configs.js` | webhook_configs + webhook_logs 表结构 |
| 管理 API | `backend/server.js` (line ~2347) | 5 个 Webhook 管理端点 |
| Handler 目录 | `backend/api/handlers/webhook/` | listConfigs/createConfig/updateConfig/deleteConfig/getLogs |

### SaaS 签名生成完整流程

```javascript
// 1. 构建 payload
const payload = {
  event_type: 'order.status.changed',
  event_time: new Date().toISOString(),
  data: { saas_order_id, saas_order_no, tms_order_id, tms_order_no, old_status, new_status, status_label, status_description, operator, extra_data }
};

// 2. 序列化
const payloadString = JSON.stringify(payload);

// 3. 生成时间戳
const timestamp = Math.floor(Date.now() / 1000);

// 4. 拼接签名内容（⚠️ 关键：timestamp + "." + payload）
const signedPayload = `${timestamp}.${payloadString}`;

// 5. HMAC-SHA256 签名
const signature = crypto.createHmac('sha256', secretKey).update(signedPayload).digest('hex');

// 6. 设置请求头
headers['X-SaaS-Signature'] = `sha256=${signature}`;
headers['X-SaaS-Timestamp'] = String(timestamp);
headers['X-SaaS-Event-ID'] = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
```

## 附录 B：小蚁现有架构参考

| 文件 | 说明 |
|------|------|
| `backend/controllers/ThirdPartyOrderController.js` | 第三方订单 CRUD（static 方法） |
| `backend/services/CallbackService.js` | 小蚁对外回调（签名+推送，HMAC-SHA256） |
| `backend/models/Order.js` | 订单模型（含 `findByThirdPartyOrderNo` 方法） |
| `backend/models/OrderCallback.js` | 回调日志模型（发出的，含重试机制） |
| `backend/models/ThirdPartyPlatform.js` | 第三方平台注册（`getTenantConnection('global')`） |
| `backend/middleware/apiKeyAuth.js` | API Key 认证中间件（`X-Api-Key` → `findByApiKey`） |
| `backend/middleware/tenant.js` | 租户中间件（需新增 webhook 豁免） |
| `backend/routes/v1.js` | 第三方 API v1 路由（需新增 webhook 路由） |
| `docs/第三方订单API接入指南.md` | 对外接入文档 |

---

## 附录 C：与 skills 规范对齐审查表

| 规范条目 | 对齐情况 | 说明 |
|---------|---------|------|
| 1.1 目录职责 | ✅ | Controller/Model/Service 分层，webhook 适配器放 `services/webhook/` |
| 1.2 文件放置 | ✅ | 迁移脚本放 `scripts/migrations/`，不放根目录 |
| 2.1 代码风格 | ✅ | ES2020+、单引号、分号、PascalCase 文件名、camelCase 变量 |
| 2.2 Controller 规范 | ✅ | static 方法、try/catch、错误日志格式 |
| 2.3 Model 规范 | ✅ | static 方法、构造函数映射字段、getTenantConnection + release |
| 2.4 Route 规范 | ✅ | 注释块分组、RESTful 风格 |
| 4.1 连接管理 | ✅ | 统一 getTenantConnection，finally 中 release |
| 4.2 SQL 规范 | ✅ | 参数化查询、snake_case 字段、created_at/updated_at |
| 4.3 Schema 变更 | ✅ | 同步更新 docs/database/schema.sql |
| 5.2 API-First | ✅ | 先更新 openapi/paths/ 和 openapi/components/schemas/，再写代码 |
| 5.4 $ref 引用规则 | ✅ | 路径文件使用相对路径 ../components/schemas/ |
| 5.8 响应格式 | ✅ | 统一 `{ success, data/message }` |
| 6.1 HTTP 状态码 | ✅ | 200/401/404 按规范使用 |
| 8.3 访问入口 | ✅ | 管理后台后续迭代遵循 hash 路由 |
| 9 新增模块 Checklist | ✅ | 完整清单见上方 |
| 10 禁止事项 | ✅ | 无硬编码密钥、无字符串拼接 SQL、无 Controller 直接写 SQL |

---

**文档版本**: v3.2（开发实施完成版）
**创建日期**: 2026-07-26
**更新日期**: 2026-07-26
**状态**: 开发完成，待联调
**下一步**: 端到端联调 → 生产部署 → 更换正式密钥
