# 第三方订单 API 接入指南

> 本文档介绍第三方平台如何通过 API 接入小蚁搬运平台，实现订单创建、状态查询、对账等功能。

## 概述

小蚁搬运提供 RESTful API 供第三方平台接入，主要功能包括：

- **创建订单** - 第三方平台推送订单到小蚁搬运
- **查询订单** - 查询订单状态和详情
- **取消订单** - 取消未完成的订单
- **对账查询** - 按日期范围查询订单，用于财务对账
- **状态回调** - 订单状态变更时主动通知第三方
- **微信支付** - 集成微信支付能力

## 接入流程

### 1. 申请接入

联系小蚁搬运平台管理员，提供以下信息：

- 平台名称
- 平台编码（英文，如 `huolala`）
- 回调地址（用于接收订单状态变更通知）

平台审核通过后，会分配：
- **API Key** - 用于接口认证
- **API Secret** - 用于回调签名验证

### 2. 认证方式

所有 API 请求需要在请求头中携带：

```
X-Api-Key: your_api_key_here
x-tenant-code: tenant_code_here
```

- `X-Api-Key`: 平台分配的 API Key
- `x-tenant-code`: 租户编码（订单归属的租户）

### 3. 签名验证（回调）

订单状态变更回调时，会在请求头中携带签名：

```
X-Callback-Signature: signature_hex
X-Callback-Timestamp: timestamp
```

签名算法：`HMAC-SHA256(event_type + "." + timestamp + "." + JSON.stringify(data), api_secret)`

## API 接口

### 基础信息

- **Base URL**: `https://api.xiaoyibanyun.com/api/v1`
- **认证方式**: API Key（请求头 `X-Api-Key`）
- **数据格式**: JSON
- **字符编码**: UTF-8

### 通用响应格式

```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

错误响应：

```json
{
  "success": false,
  "message": "错误描述"
}
```

---

## 接口详情

### 1. 创建订单

**POST** `/v1/orders`

创建新订单并推送到小蚁搬运平台。

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| customer_name | string | 是 | 客户姓名 |
| phone | string | 是 | 客户电话 |
| address | string | 是 | 客户地址 |
| amount | number | 是 | 订单金额 |
| third_party_order_no | string | 否 | 第三方订单号（用于对账，不可重复） |
| title | string | 否 | 订单标题 |
| description | string | 否 | 订单描述 |
| pickup_address | string | 否 | 取货地址 |
| delivery_address | string | 否 | 送货地址 |
| pickup_time | datetime | 否 | 取货时间（ISO 8601） |
| delivery_time | datetime | 否 | 送货时间（ISO 8601） |
| distance | number | 否 | 距离(km) |
| weight | number | 否 | 重量(kg) |
| volume | number | 否 | 体积(m³) |
| items | array | 否 | 物品列表 `[{name, quantity}]` |
| notes | string | 否 | 备注 |
| callback_url | string | 否 | 状态回调地址（覆盖平台默认回调） |

#### 请求示例

```bash
curl -X POST https://api.xiaoyibanyun.com/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: your_api_key" \
  -H "x-tenant-code: default" \
  -d '{
    "customer_name": "张三",
    "phone": "13800138000",
    "address": "北京市朝阳区xxx大厦",
    "title": "家庭搬迁",
    "pickup_address": "北京市朝阳区xxx大厦",
    "delivery_address": "北京市海淀区yyy园区",
    "amount": 280.00,
    "third_party_order_no": "TP202401230001",
    "callback_url": "https://your-domain.com/callback/order"
  }'
```

#### 响应示例

```json
{
  "success": true,
  "message": "订单创建成功",
  "data": {
    "id": 1,
    "order_no": "XY2401231015001234",
    "third_party_order_no": "TP202401230001",
    "source": "third_party",
    "customer_name": "张三",
    "phone": "13800138000",
    "address": "北京市朝阳区xxx大厦",
    "amount": 280.00,
    "status": "pending",
    "callback_url": "https://your-domain.com/callback/order",
    "created_at": "2024-01-23T10:15:00.000Z",
    "updated_at": "2024-01-23T10:15:00.000Z"
  }
}
```

#### 错误码

| HTTP 状态码 | 说明 |
|------------|------|
| 400 | 参数校验失败 |
| 401 | API Key 无效或平台已禁用 |
| 409 | 第三方订单号已存在 |

---

### 2. 查询订单

**GET** `/v1/orders/{order_no}`

查询订单状态和详情。

#### 路径参数

| 参数 | 说明 |
|------|------|
| order_no | 小蚁搬运订单号（创建时返回的 `order_no`） |

#### 请求示例

```bash
curl -X GET https://api.xiaoyibanyun.com/api/v1/orders/XY2401231015001234 \
  -H "X-Api-Key: your_api_key" \
  -H "x-tenant-code: default"
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_no": "XY2401231015001234",
    "third_party_order_no": "TP202401230001",
    "source": "third_party",
    "customer_name": "张三",
    "status": "in_progress",
    "amount": 280.00,
    ...
  }
}
```

#### 订单状态说明

| 状态 | 说明 |
|------|------|
| pending | 待处理 |
| assigned | 已分配（工人已接单） |
| in_progress | 进行中 |
| completed | 已完成 |
| cancelled | 已取消 |

---

### 3. 取消订单

**POST** `/v1/orders/{order_no}/cancel`

取消未完成的订单。

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| reason | string | 否 | 取消原因 |

#### 请求示例

```bash
curl -X POST https://api.xiaoyibanyun.com/api/v1/orders/XY2401231015001234/cancel \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: your_api_key" \
  -H "x-tenant-code: default" \
  -d '{"reason": "客户临时取消"}'
```

#### 响应示例

```json
{
  "success": true,
  "message": "订单已取消",
  "data": {
    "order_no": "XY2401231015001234",
    "status": "cancelled"
  }
}
```

#### 限制

- 已完成（completed）或已取消（cancelled）的订单无法再次取消

---

### 4. 对账查询

**GET** `/v1/orders/reconciliation`

按日期范围查询订单列表，用于财务对账。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | date | 是 | 开始日期（YYYY-MM-DD） |
| endDate | date | 是 | 结束日期（YYYY-MM-DD） |
| page | int | 否 | 页码，默认 1 |
| limit | int | 否 | 每页数量，默认 20，最大 100 |

#### 请求示例

```bash
curl -X GET "https://api.xiaoyibanyun.com/api/v1/orders/reconciliation?startDate=2024-01-01&endDate=2024-01-31&page=1&limit=20" \
  -H "X-Api-Key: your_api_key" \
  -H "x-tenant-code: default"
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "order_no": "XY2401231015001234",
        "third_party_order_no": "TP202401230001",
        "amount": 280.00,
        "status": "completed",
        "created_at": "2024-01-23T10:15:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "pages": 5
    },
    "summary": {
      "total_amount": 28000.00,
      "order_count": 100
    }
  }
}
```

---

## 状态回调

### 回调格式

订单状态变更时，系统会向配置的 `callback_url` 发送 POST 请求：

```json
{
  "event_type": "order_status_change",
  "timestamp": 1706000000,
  "data": {
    "order_no": "XY2401231015001234",
    "third_party_order_no": "TP202401230001",
    "status": "in_progress",
    "amount": 280.00,
    "updated_at": "2024-01-23T10:30:00.000Z"
  },
  "sign": "a1b2c3d4e5f6..."
}
```

### 事件类型

| event_type | 说明 |
|------------|------|
| order_status_change | 订单状态变更 |
| order_cancel | 订单取消 |

### 签名验证

```javascript
const crypto = require('crypto');

function verifySignature(eventType, timestamp, data, signature, apiSecret) {
  const signString = `${eventType}.${timestamp}.${JSON.stringify(data)}`;
  const expectedSignature = crypto
    .createHmac('sha256', apiSecret)
    .update(signString)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### 回调响应

第三方需返回 HTTP 200 表示接收成功，否则系统会重试（最多 3 次，指数退避）。

---

## 微信支付

### 发起支付

**POST** `/v1/payments/wechat/create`

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| order_no | string | 是 | 订单号 |
| open_id | string | 否 | 用户 openId（JSAPI 支付必填） |
| trade_type | string | 否 | 交易类型：JSAPI/NATIVE，默认 JSAPI |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "order_no": "XY2401231015001234",
    "amount": 280.00,
    "pay_params": {
      "appId": "wx...",
      "timeStamp": "1706000000",
      "nonceStr": "xxx",
      "package": "prepay_id=xxx",
      "signType": "MD5",
      "paySign": "xxx"
    }
  }
}
```

### 支付回调

支付成功后，微信会通知小蚁搬运，系统自动更新订单状态为已完成。

---

## 错误码汇总

| HTTP 状态码 | 说明 |
|------------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 参数错误 |
| 401 | 未认证（API Key 无效） |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如订单号重复） |
| 500 | 服务器内部错误 |

---

## SDK 示例

### Node.js

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://api.xiaoyibanyun.com/api/v1',
  headers: {
    'X-Api-Key': 'your_api_key',
    'x-tenant-code': 'default'
  }
});

// 创建订单
const order = await client.post('/orders', {
  customer_name: '张三',
  phone: '13800138000',
  address: '北京市朝阳区xxx大厦',
  amount: 280.00,
  third_party_order_no: 'TP001'
});

// 查询订单
const detail = await client.get(`/orders/${order.data.data.order_no}`);

// 对账查询
const reconciliation = await client.get('/orders/reconciliation', {
  params: {
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  }
});
```

### Python

```python
import requests

headers = {
    'X-Api-Key': 'your_api_key',
    'x-tenant-code': 'default'
}

# 创建订单
resp = requests.post('https://api.xiaoyibanyun.com/api/v1/orders', json={
    'customer_name': '张三',
    'phone': '13800138000',
    'address': '北京市朝阳区xxx大厦',
    'amount': 280.00,
    'third_party_order_no': 'TP001'
}, headers=headers)

# 查询订单
order_no = resp.json()['data']['order_no']
detail = requests.get(f'https://api.xiaoyibanyun.com/api/v1/orders/{order_no}', headers=headers)
```

---

## 常见问题

### Q: 第三方订单号有什么用？

A: `third_party_order_no` 用于第三方平台与小蚁搬运的订单对账，确保订单唯一性。如果传入，系统会检查是否重复。

### Q: 回调失败怎么办？

A: 系统会自动重试，最多 3 次，采用指数退避策略（1分钟、2分钟、4分钟）。

### Q: 如何测试回调？

A: 可以使用 ngrok 等工具将本地服务暴露到公网，配置为回调地址进行测试。

### Q: 订单金额单位是什么？

A: 元（人民币），保留两位小数。

---

## 技术支持

如有问题，请联系：
- 邮箱: support@xiaoyibanyun.com
- 电话: 400-xxx-xxxx

---

**文档版本**: v1.0  
**最后更新**: 2026-07-24
