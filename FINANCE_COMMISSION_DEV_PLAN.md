# 财务和抽佣配置功能开发计划

## 📋 需求分析

### 1. 财务管理模块（GMV 数据）

#### 导航栏项目
- **财务总览** - 显示平台核心财务指标

#### 核心指标
1. **昨日成交金额** - 前一天的订单成交总额
2. **月度累计成交金额** - 当月累计订单成交总额
3. **年度累计成交金额** - 当年累计订单成交总额
4. **平台服务费收入** - 平台收取的服务费总额
5. **提现金额** - 用户提现总额
6. **平台结余** - 平台账户余额

#### 计算公式
```
昨日成交金额 = SUM(orders.amount) WHERE DATE(orders.complete_time) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)

月度累计成交金额 = SUM(orders.amount) WHERE YEAR(orders.complete_time) = YEAR(NOW()) AND MONTH(orders.complete_time) = MONTH(NOW())

年度累计成交金额 = SUM(orders.amount) WHERE YEAR(orders.complete_time) = YEAR(NOW())

平台服务费收入 = SUM(orders.service_fee) WHERE orders.status = 'completed'

提现金额 = SUM(withdrawals.amount) WHERE withdrawals.status = 'completed'

平台结余 = SUM(accounts.balance) WHERE accounts.type = 'platform'
```

### 2. 抽佣配置模块

#### 导航栏项目
- **抽佣配置** - 管理订单抽佣规则

#### 抽佣指标
1. **信息费** - 订单信息展示费用（固定金额）
2. **服务费** - 平台服务费用（按比例或固定金额）
3. **保险费** - 订单保险费用（可选）
4. **抽佣比例** - 平台抽佣比例（百分比）

#### 配置项
```json
{
  "commission_rate": "0.1000",        // 默认抽佣比例 10%
  "service_fee_rate": "0.0500",       // 服务费比例 5%
  "service_fee_min": "5.00",          // 最低服务费 5 元
  "service_fee_max": "100.00",        // 最高服务费 100 元
  "information_fee": "2.00",          // 信息费 2 元
  "insurance_fee_rate": "0.0100",     // 保险费比例 1%
  "insurance_fee_min": "1.00",        // 最低保险费 1 元
  "insurance_fee_max": "50.00"        // 最高保险费 50 元
}
```

## 📝 API 设计

### 财务管理 API

#### 1. 获取财务总览数据
```
GET /admin/finance/overview
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "yesterday_gmv": 15000.00,
    "month_gmv": 450000.00,
    "year_gmv": 5400000.00,
    "platform_service_fee": 22500.00,
    "withdrawal_amount": 180000.00,
    "platform_balance": 2500000.00,
    "formulas": {
      "yesterday_gmv": "SUM(orders.amount) WHERE DATE(complete_time) = 昨日日期",
      "month_gmv": "SUM(orders.amount) WHERE 本月",
      "year_gmv": "SUM(orders.amount) WHERE 本年",
      "platform_service_fee": "SUM(orders.service_fee) WHERE 已完成订单",
      "withdrawal_amount": "SUM(withdrawals.amount) WHERE 已完成提现",
      "platform_balance": "SUM(accounts.balance) WHERE 平台账户"
    }
  }
}
```

### 抽佣配置 API

#### 1. 获取抽佣配置
```
GET /admin/commission/config
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "config": {
      "commission_rate": "0.1000",
      "service_fee_rate": "0.0500",
      "service_fee_min": "5.00",
      "service_fee_max": "100.00",
      "information_fee": "2.00",
      "insurance_fee_rate": "0.0100",
      "insurance_fee_min": "1.00",
      "insurance_fee_max": "50.00"
    }
  }
}
```

#### 2. 更新抽佣配置
```
PUT /admin/commission/config
```

**请求示例**:
```json
{
  "commission_rate": "0.1200",
  "service_fee_rate": "0.0600",
  "service_fee_min": "5.00",
  "service_fee_max": "120.00",
  "information_fee": "3.00",
  "insurance_fee_rate": "0.0150",
  "insurance_fee_min": "2.00",
  "insurance_fee_max": "60.00"
}
```

#### 3. 获取订单抽佣明细
```
GET /admin/orders/{id}/commission
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "order_id": 123,
    "order_amount": 500.00,
    "commission_details": {
      "commission_rate": "0.1000",
      "commission_amount": 50.00,
      "service_fee": 25.00,
      "information_fee": 2.00,
      "insurance_fee": 5.00,
      "total_fee": 82.00,
      "worker_income": 418.00
    }
  }
}
```

## 🗄️ 数据库设计

### 1. 系统配置表 (system_configs)
```sql
CREATE TABLE system_configs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description TEXT,
  updated_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (config_key)
);
```

### 2. 订单费用表 (order_fees)
```sql
CREATE TABLE order_fees (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  order_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  service_fee DECIMAL(10,2) DEFAULT 0,
  information_fee DECIMAL(10,2) DEFAULT 0,
  insurance_fee DECIMAL(10,2) DEFAULT 0,
  total_fee DECIMAL(10,2) NOT NULL,
  worker_income DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'calculated', 'paid') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order (order_id),
  INDEX idx_status (status),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

### 3. 账户表扩展 (accounts)
```sql
ALTER TABLE accounts ADD COLUMN account_type ENUM('platform', 'tenant', 'user', 'worker') DEFAULT 'user';
ALTER TABLE accounts ADD INDEX idx_type (account_type);
```

## 📊 前端页面设计

### 1. 财务总览页面
- 卡片式布局显示核心指标
- 趋势图表展示
- 数据公式说明

### 2. 抽佣配置页面
- 表单配置各项费率
- 实时计算示例
- 历史记录查看

## 🔧 开发任务

### Phase 1: 数据库和模型
- [ ] 创建 system_configs 表
- [ ] 创建 order_fees 表
- [ ] 扩展 accounts 表
- [ ] 创建 CommissionConfig 模型
- [ ] 创建 OrderFee 模型

### Phase 2: 后端 API
- [ ] 实现财务总览 API
- [ ] 实现抽佣配置 API
- [ ] 实现订单抽佣明细 API
- [ ] 添加数据计算逻辑

### Phase 3: 前端页面
- [ ] 财务总览页面
- [ ] 抽佣配置页面
- [ ] 订单抽佣详情弹窗

### Phase 4: 测试和文档
- [ ] API 测试
- [ ] 前端测试
- [ ] 更新 openapi.yaml
- [ ] 编写使用文档

## 📝 注意事项

1. **数据精度** - 所有金额使用 DECIMAL(10,2)
2. **费率精度** - 费率使用 DECIMAL(5,4)（最多 4 位小数）
3. **权限控制** - 只有平台管理员可以访问
4. **审计日志** - 记录配置变更历史
5. **缓存策略** - 财务数据适当缓存
