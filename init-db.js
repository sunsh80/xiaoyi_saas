/**
 * 小蚁搬运平台初始化脚本
 * 用于创建数据库表和插入初始数据
 */

require('dotenv').config({ path: './backend/.env' }); // 移到最前面
const mysql = require('mysql2/promise');

async function initializeDatabase() {
  console.log('🚀 开始初始化小蚁搬运平台数据库...');

  // 数据库连接配置
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    charset: 'utf8mb4'
  });

  try {
    const dbName = process.env.DB_NAME || 'xiaoyi_banyun';

    // 创建数据库（如果不存在）
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ 数据库 ${dbName} 创建或已存在`);

    // 使用该数据库
    await connection.query(`USE \`${dbName}\`;`);

    // 创建表的SQL语句（从schema.sql提取）
    const createTablesSQL = `
-- 租户表 (Tenants)
CREATE TABLE IF NOT EXISTS tenants (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_code VARCHAR(50) UNIQUE NOT NULL COMMENT '租户编码',
    name VARCHAR(255) NOT NULL COMMENT '租户名称',
    contact_person VARCHAR(100) COMMENT '联系人',
    contact_phone VARCHAR(20) COMMENT '联系电话',
    email VARCHAR(255) COMMENT '邮箱',
    address TEXT COMMENT '地址',
    logo_url VARCHAR(500) COMMENT 'LOGO地址',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenant_code (tenant_code),
    INDEX idx_status (status)
);

-- 用户表 (Users)
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL COMMENT '租户ID',
    username VARCHAR(100) NOT NULL COMMENT '用户名',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    phone VARCHAR(20) NOT NULL COMMENT '手机号',
    email VARCHAR(255) COMMENT '邮箱',
    real_name VARCHAR(100) COMMENT '真实姓名',
    avatar_url VARCHAR(500) COMMENT '头像URL',
    role ENUM('tenant_admin', 'tenant_user', 'worker') NOT NULL COMMENT '角色',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_username (username),
    INDEX idx_phone (phone),
    INDEX idx_role (role)
);

-- 订单表 (Orders)
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id BIGINT NOT NULL COMMENT '租户ID',
    order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '订单号',
    title VARCHAR(255) NOT NULL COMMENT '订单标题',
    description TEXT COMMENT '订单描述',
    pickup_address TEXT NOT NULL COMMENT '取货地址',
    delivery_address TEXT NOT NULL COMMENT '送货地址',
    pickup_time DATETIME COMMENT '取货时间',
    delivery_time DATETIME COMMENT '送达时间',
    distance DECIMAL(10,2) COMMENT '距离(公里)',
    weight DECIMAL(10,2) COMMENT '重量(公斤)',
    volume DECIMAL(10,2) COMMENT '体积(立方米)',
    amount DECIMAL(10,2) NOT NULL COMMENT '金额',
    status ENUM('pending', 'assigned', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending' COMMENT '订单状态',
    assignee_user_id BIGINT COMMENT '接单用户ID',
    assign_time DATETIME COMMENT '分配时间',
    complete_time DATETIME COMMENT '完成时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (assignee_user_id) REFERENCES users(id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_order_no (order_no),
    INDEX idx_status (status),
    INDEX idx_assignee_user_id (assignee_user_id),
    INDEX idx_created_at (created_at)
);

-- 接单人员表 (Workers)
CREATE TABLE IF NOT EXISTS workers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    worker_no VARCHAR(50) UNIQUE COMMENT '工号',
    identity_card VARCHAR(20) COMMENT '身份证号',
    license_plate VARCHAR(20) COMMENT '车牌号',
    vehicle_type VARCHAR(50) COMMENT '车辆类型',
    vehicle_photo VARCHAR(500) COMMENT '车辆照片',
    driving_license_photo VARCHAR(500) COMMENT '驾驶证照片',
    work_status TINYINT DEFAULT 1 COMMENT '工作状态: 0-休息, 1-工作中',
    rating DECIMAL(3,2) DEFAULT 5.00 COMMENT '评分',
    total_orders INT DEFAULT 0 COMMENT '总完成订单数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_worker_no (worker_no),
    INDEX idx_work_status (work_status)
);

-- 订单操作记录表 (Order Logs)
CREATE TABLE IF NOT EXISTS order_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL COMMENT '订单ID',
    operator_id BIGINT NOT NULL COMMENT '操作人ID',
    operation_type VARCHAR(50) NOT NULL COMMENT '操作类型',
    description TEXT COMMENT '操作描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (operator_id) REFERENCES users(id),
    INDEX idx_order_id (order_id),
    INDEX idx_operator_id (operator_id)
);

-- 系统管理员表 (Admin Users)
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL COMMENT '用户名',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    real_name VARCHAR(100) COMMENT '真实姓名',
    phone VARCHAR(20) COMMENT '手机号',
    email VARCHAR(255) COMMENT '邮箱',
    role ENUM('super_admin', 'admin', 'operator') DEFAULT 'admin' COMMENT '角色',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
);

-- 账户表 (Accounts)
CREATE TABLE IF NOT EXISTS accounts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT COMMENT '用户ID (NULL表示平台账户)',
    tenant_id BIGINT COMMENT '租户ID (NULL表示平台账户)',
    account_type ENUM('platform', 'tenant', 'user') NOT NULL COMMENT '账户类型',
    balance DECIMAL(10,2) DEFAULT 0.00 COMMENT '余额',
    frozen_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '冻结金额',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    INDEX idx_user_id (user_id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_account_type (account_type)
);

-- 支付记录表 (Payments)
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL COMMENT '订单ID',
    payer_id BIGINT NOT NULL COMMENT '付款方用户ID',
    payee_id BIGINT NOT NULL COMMENT '收款方用户ID',
    amount DECIMAL(10,2) NOT NULL COMMENT '支付金额',
    payment_method ENUM('wechat_pay', 'alipay', 'balance') DEFAULT 'wechat_pay' COMMENT '支付方式',
    transaction_no VARCHAR(64) COMMENT '第三方交易号',
    status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending' COMMENT '支付状态',
    payment_time TIMESTAMP NULL COMMENT '支付时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (payer_id) REFERENCES users(id),
    FOREIGN KEY (payee_id) REFERENCES users(id),
    INDEX idx_order_id (order_id),
    INDEX idx_transaction_no (transaction_no),
    INDEX idx_status (status)
);

-- 提现申请表 (Withdrawals)
CREATE TABLE IF NOT EXISTS withdrawals (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT '申请提现的用户ID',
    amount DECIMAL(10,2) NOT NULL COMMENT '提现金额',
    account_info JSON COMMENT '提现账户信息 (银行卡号、支付宝账号、微信等)',
    status ENUM('pending', 'processing', 'completed', 'rejected') DEFAULT 'pending' COMMENT '状态',
    remark TEXT COMMENT '备注',
    processed_by BIGINT COMMENT '处理人ID',
    processed_at TIMESTAMP NULL COMMENT '处理时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (processed_by) REFERENCES admin_users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- 佣金记录表 (Commissions)
CREATE TABLE IF NOT EXISTS commissions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL COMMENT '订单ID',
    admin_user_id BIGINT COMMENT '操作管理员ID',
    commission_rate DECIMAL(5,4) NOT NULL COMMENT '抽佣比例',
    commission_amount DECIMAL(10,2) NOT NULL COMMENT '抽佣金额',
    platform_revenue DECIMAL(10,2) NOT NULL COMMENT '平台收入',
    description TEXT COMMENT '描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id),
    INDEX idx_order_id (order_id),
    INDEX idx_created_at (created_at)
);

-- 系统配置表 (System Configurations)
CREATE TABLE IF NOT EXISTS system_configs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    description VARCHAR(255) COMMENT '描述',
    updated_by BIGINT COMMENT '更新人ID',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES admin_users(id),
    INDEX idx_config_key (config_key)
);

-- 拉新活动表 (Referral Campaigns)
CREATE TABLE IF NOT EXISTS referral_campaigns (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    campaign_name VARCHAR(255) NOT NULL COMMENT '活动名称',
    campaign_title VARCHAR(255) NOT NULL COMMENT '活动标题',
    campaign_description TEXT COMMENT '活动描述',
    share_title VARCHAR(255) NOT NULL COMMENT '分享标题',
    share_desc VARCHAR(500) COMMENT '分享描述',
    share_image VARCHAR(500) COMMENT '分享图片',
    referral_reward_type ENUM('fixed', 'percentage') NOT NULL DEFAULT 'fixed' COMMENT '奖励类型: 固定金额/百分比',
    referral_reward_amount DECIMAL(10,2) COMMENT '推荐奖励金额',
    referral_reward_percentage DECIMAL(5,2) COMMENT '推荐奖励百分比',
    referee_reward_type ENUM('fixed', 'percentage') NOT NULL DEFAULT 'fixed' COMMENT '被推荐人奖励类型',
    referee_reward_amount DECIMAL(10,2) COMMENT '被推荐人奖励金额',
    referee_reward_percentage DECIMAL(5,2) COMMENT '被推荐人奖励百分比',
    reward_limit_per_referrer INT DEFAULT NULL COMMENT '推荐人奖励上限次数',
    reward_limit_per_referee INT DEFAULT NULL COMMENT '被推荐人奖励上限次数',
    start_time DATETIME NOT NULL COMMENT '活动开始时间',
    end_time DATETIME NOT NULL COMMENT '活动结束时间',
    status ENUM('draft', 'active', 'paused', 'ended') DEFAULT 'draft' COMMENT '活动状态',
    created_by BIGINT COMMENT '创建人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admin_users(id),
    INDEX idx_status (status),
    INDEX idx_start_end_time (start_time, end_time)
);

-- 推荐关系表 (Referral Relations)
CREATE TABLE IF NOT EXISTS referrals (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    referrer_user_id BIGINT NOT NULL COMMENT '推荐人用户ID',
    referee_user_id BIGINT NOT NULL COMMENT '被推荐人用户ID',
    campaign_id BIGINT NOT NULL COMMENT '活动ID',
    referral_code VARCHAR(50) NOT NULL COMMENT '推荐码',
    status ENUM('pending', 'confirmed', 'rewarded', 'expired') DEFAULT 'pending' COMMENT '状态',
    confirmed_at TIMESTAMP NULL COMMENT '确认时间',
    rewarded_at TIMESTAMP NULL COMMENT '奖励发放时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_user_id) REFERENCES users(id),
    FOREIGN KEY (referee_user_id) REFERENCES users(id),
    FOREIGN KEY (campaign_id) REFERENCES referral_campaigns(id),
    INDEX idx_referrer_user_id (referrer_user_id),
    INDEX idx_referee_user_id (referee_user_id),
    INDEX idx_campaign_id (campaign_id),
    INDEX idx_referral_code (referral_code),
    UNIQUE KEY uk_referrer_referee_campaign (referrer_user_id, referee_user_id, campaign_id)
);

-- 推荐奖励记录表 (Referral Rewards)
CREATE TABLE IF NOT EXISTS referral_rewards (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    referral_id BIGINT NOT NULL COMMENT '推荐关系ID',
    user_id BIGINT NOT NULL COMMENT '获奖用户ID',
    reward_type ENUM('referrer', 'referee') NOT NULL COMMENT '奖励类型: 推荐人/被推荐人',
    reward_amount DECIMAL(10,2) NOT NULL COMMENT '奖励金额',
    reward_description VARCHAR(255) COMMENT '奖励描述',
    status ENUM('pending', 'paid', 'failed') DEFAULT 'pending' COMMENT '状态',
    paid_at TIMESTAMP NULL COMMENT '支付时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (referral_id) REFERENCES referrals(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_referral_id (referral_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
);
    `;

    // 将SQL字符串按分号分割，并去除空行和注释行
    const statements = createTablesSQL.split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    // 逐条执行CREATE TABLE语句
    for (const statement of statements) {
      if (statement) { // 确保语句非空
        try {
          await connection.query(statement);
        } catch (stmtErr) {
          // 如果某个表已存在，CREATE TABLE IF NOT EXISTS 应该不会报错。如果报错，可能是SQL本身有问题。
          // 记录错误但继续执行后续语句
          console.warn(`⚠️  执行SQL语句时可能遇到问题 (可能无害，如表已存在): ${stmtErr.message}\nSQL: ${statement}`);
          // 或者，如果希望遇到错误就停止，可以取消下面这行的注释
          // throw stmtErr;
        }
      }
    }
    console.log('✅ 所有数据表创建完成');

    // 插入默认配置
    const insertConfigsSQL = `
INSERT INTO system_configs (config_key, config_value, description) VALUES
('commission_rate', '0.1000', '默认抽佣比例 10%'),
('payment_methods', '["wechat_pay", "alipay"]', '可用支付方式'),
('min_withdrawal_amount', '10.00', '最小提现金额')
ON DUPLICATE KEY UPDATE
  config_value = VALUES(config_value),
  description = VALUES(description);
    `;

    await connection.query(insertConfigsSQL);
    console.log('✅ 默认系统配置插入完成');

    // 创建平台账户
    const createPlatformAccountSQL = `
INSERT INTO accounts (account_type, balance, created_at)
SELECT 'platform', 0.00, NOW()
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE account_type = 'platform');
    `;

    await connection.query(createPlatformAccountSQL);
    console.log('✅ 平台账户创建完成（如果不存在）');

    // 创建示例推荐活动
    const createSampleCampaignSQL = `
INSERT INTO referral_campaigns (
    campaign_name,
    campaign_title,
    campaign_description,
    share_title,
    share_desc,
    share_image,
    referral_reward_type,
    referral_reward_amount,
    referee_reward_type,
    referee_reward_amount,
    reward_limit_per_referrer,
    reward_limit_per_referee,
    start_time,
    end_time,
    status,
    created_at
)
SELECT
    '春季拉新活动',
    '邀请好友，共享好礼',
    '邀请好友注册并完成首单，双方均可获得奖励',
    '快来加入小蚁搬运，一起赚钱吧！',
    '专业搬运服务，安全可靠，收益丰厚',
    '/images/referral-share.jpg',
    'fixed',
    10.00,
    'fixed',
    5.00,
    10,
    1,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    DATE_ADD(NOW(), INTERVAL 30 DAY),
    'active',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM referral_campaigns WHERE campaign_name = '春季拉新活动');
    `;

    await connection.query(createSampleCampaignSQL);
    console.log('✅ 示例推荐活动创建完成（如果不存在）');

    console.log('\n🎉 小蚁搬运平台数据库初始化完成！');
    console.log(`📋 数据库: ${dbName}`);
    console.log('💡 接下来您可以：');
    console.log('   1. 启动后端服务: npm start');
    console.log('   2. 运行API一致性检查: node check-api-consistency-simple.js');
    console.log('   3. 查看API文档: npx @redocly/cli preview-docs openapi.yaml');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// 执行初始化
if (require.main === module) {
  initializeDatabase().catch(console.error);
}

module.exports = initializeDatabase;