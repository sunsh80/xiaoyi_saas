# 财务和抽佣配置功能 - 第一阶段完成报告

## ✅ 已完成的工作

### Phase 1: 数据库和模型 ✅

#### 1. 数据库迁移
- ✅ 创建系统配置表 (system_configs)
  - 存储佣金配置、费率配置等
  - 支持多种数据类型（string, number, boolean, json）
  - 索引优化：idx_key

- ✅ 创建订单费用表 (order_fees)
  - 记录每笔订单的佣金明细
  - 包含：订单金额、佣金比例、服务费、信息费、保险费
  - 索引优化：idx_order, idx_status
  - 外键关联：orders(id)

- ✅ 扩展账户表 (accounts)
  - 添加 account_type 字段（platform, tenant, user, worker）
  - 添加 idx_type 索引
  - 创建平台账户

- ✅ 初始化系统配置数据
  - commission_rate: 0.1000 (10% 抽佣比例)
  - service_fee_rate: 0.0500 (5% 服务费比例)
  - service_fee_min: 5.00 (最低服务费)
  - service_fee_max: 100.00 (最高服务费)
  - information_fee: 2.00 (信息费)
  - insurance_fee_rate: 0.0100 (1% 保险费比例)
  - insurance_fee_min: 1.00 (最低保险费)
  - insurance_fee_max: 50.00 (最高保险费)

#### 2. 模型创建
- ✅ CommissionConfig 模型
  - getAllConfigs() - 获取所有配置
  - getConfig() - 获取单个配置
  - updateConfig() - 更新配置
  - updateConfigs() - 批量更新
  - calculateOrderCommission() - 计算订单佣金

### 📊 数据库表结构

#### system_configs
```sql
CREATE TABLE system_configs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description TEXT,
  updated_by BIGINT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_key (config_key)
);
```

#### order_fees
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
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_order (order_id),
  INDEX idx_status (status),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

#### accounts (扩展)
```sql
ALTER TABLE accounts 
ADD COLUMN account_type ENUM('platform', 'tenant', 'user', 'worker') DEFAULT 'user',
ADD INDEX idx_type (account_type);
```

## 📝 计算公式

### GMV 相关指标

1. **昨日成交金额**
```sql
SELECT COALESCE(SUM(o.amount), 0) as yesterday_gmv
FROM orders o
WHERE o.status = 'completed'
  AND DATE(o.complete_time) = DATE_SUB(CURDATE(), INTERVAL 1 DAY);
```

2. **月度累计成交金额**
```sql
SELECT COALESCE(SUM(o.amount), 0) as month_gmv
FROM orders o
WHERE o.status = 'completed'
  AND YEAR(o.complete_time) = YEAR(NOW())
  AND MONTH(o.complete_time) = MONTH(NOW());
```

3. **年度累计成交金额**
```sql
SELECT COALESCE(SUM(o.amount), 0) as year_gmv
FROM orders o
WHERE o.status = 'completed'
  AND YEAR(o.complete_time) = YEAR(NOW());
```

4. **平台服务费收入**
```sql
SELECT COALESCE(SUM(of.service_fee), 0) as platform_service_fee
FROM order_fees of
JOIN orders o ON of.order_id = o.id
WHERE o.status = 'completed';
```

5. **提现金额**
```sql
SELECT COALESCE(SUM(w.amount), 0) as withdrawal_amount
FROM withdrawals w
WHERE w.status = 'completed';
```

6. **平台结余**
```sql
SELECT COALESCE(SUM(a.balance), 0) as platform_balance
FROM accounts a
WHERE a.account_type = 'platform';
```

### 订单佣金计算

```javascript
// 从 CommissionConfig.calculateOrderCommission()
const commissionRate = 0.10;  // 10%
const serviceFeeRate = 0.05;  // 5%
const informationFee = 2.00;  // 2 元
const insuranceFeeRate = 0.01; // 1%

// 计算示例：订单金额 500 元
const orderAmount = 500;
const commissionAmount = orderAmount * commissionRate;  // 50 元
const serviceFee = orderAmount * serviceFeeRate;        // 25 元
const insuranceFee = orderAmount * insuranceFeeRate;    // 5 元
const totalFee = commissionAmount + serviceFee + informationFee + insuranceFee;  // 82 元
const workerIncome = orderAmount - totalFee;  // 418 元
```

## 🔄 下一步计划

### Phase 2: 后端 API（待开发）
- [ ] 财务总览 API - GET /admin/finance/overview
- [ ] 获取佣金配置 API - GET /admin/commission/config
- [ ] 更新佣金配置 API - PUT /admin/commission/config
- [ ] 订单佣金明细 API - GET /admin/orders/:id/commission
- [ ] 佣金统计 API - GET /admin/commissions/statistics

### Phase 3: 前端页面（待开发）
- [ ] 财务总览页面
  - GMV 指标卡片
  - 趋势图表
  - 数据公式说明

- [ ] 抽佣配置页面
  - 费率配置表单
  - 实时计算示例
  - 历史记录

- [ ] 管理后台导航栏更新
  - 添加"财务管理"菜单
  - 添加"抽佣配置"菜单

### Phase 4: 测试和文档（待开发）
- [ ] API 单元测试
- [ ] 前端集成测试
- [ ] 更新 openapi.yaml
- [ ] 编写使用文档

## 📁 相关文件

### 新增文件
- `migrate-finance-commission.js` - 数据库迁移脚本
- `backend/models/CommissionConfig.js` - 佣金配置模型
- `FINANCE_COMMISSION_DEV_PLAN.md` - 开发计划
- `FINANCE_COMMISSION_PHASE1_COMPLETE.md` - 第一阶段完成报告

### 修改文件
- 数据库表：system_configs, order_fees, accounts

## 🎯 验证方法

### 1. 验证数据库表
```bash
cd /Users/sunsh80/Downloads/易工到项目/小蚁搬运
node -e "
require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  const [tables] = await conn.execute('SHOW TABLES LIKE \"%fee%\"');
  console.log('费用相关表:', tables);
  const [configs] = await conn.execute('SELECT * FROM system_configs LIMIT 5');
  console.log('系统配置:', configs);
  await conn.end();
})();
"
```

### 2. 测试佣金计算
```bash
cd /Users/sunsh80/Downloads/易工到项目/小蚁搬运
node -e "
const CommissionConfig = require('./backend/models/CommissionConfig');
(async () => {
  const result = await CommissionConfig.calculateOrderCommission(500, 'TEST_TENANT');
  console.log('订单佣金计算结果:', result);
})();
"
```

## ✅ 第一阶段完成！

数据库结构已就绪，模型已创建，可以进行下一阶段的 API 开发。
