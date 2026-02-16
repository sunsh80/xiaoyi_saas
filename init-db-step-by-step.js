/**
 * 简化的数据库初始化脚本
 * 用于逐步创建数据库表
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function initializeDatabaseStepByStep() {
  console.log('🚀 开始逐步初始化小蚁搬运平台数据库...');

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
    console.log(`✅ 已切换到数据库 ${dbName}`);

    // 1. 创建租户表
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ 租户表 (tenants) 创建成功');

    // 2. 创建用户表
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ 用户表 (users) 创建成功');

    // 3. 创建订单表
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ 订单表 (orders) 创建成功');

    // 4. 创建接单人员表
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ 接单人员表 (workers) 创建成功');

    // 5. 创建订单操作记录表
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ 订单操作记录表 (order_logs) 创建成功');

    // 6. 创建系统管理员表
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ 系统管理员表 (admin_users) 创建成功');

    // 7. 创建账户表
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ 账户表 (accounts) 创建成功');

    // 8. 创建支付记录表
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ 支付记录表 (payments) 创建成功');

    // 9. 创建提现申请表
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ 提现申请表 (withdrawals) 创建成功');

    // 10. 创建佣金记录表
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ 佣金记录表 (commissions) 创建成功');

    // 11. 创建系统配置表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_configs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
        config_value TEXT COMMENT '配置值',
        description VARCHAR(255) COMMENT '描述',
        updated_by BIGINT COMMENT '更新人ID',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES admin_users(id),
        INDEX idx_config_key (config_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ 系统配置表 (system_configs) 创建成功');

    // 12. 创建拉新活动表
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ 拉新活动表 (referral_campaigns) 创建成功');

    // 13. 创建推荐奖励表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS referral_rewards (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        campaign_id BIGINT NOT NULL COMMENT '活动ID',
        referrer_user_id BIGINT NOT NULL COMMENT '推荐人用户ID',
        referee_user_id BIGINT NOT NULL COMMENT '被推荐人用户ID',
        reward_type ENUM('referral', 'referee') NOT NULL COMMENT '奖励类型: 推荐奖励/被推荐奖励',
        reward_amount DECIMAL(10,2) NOT NULL COMMENT '奖励金额',
        order_id BIGINT COMMENT '关联订单ID',
        status ENUM('pending', 'credited', 'cancelled') DEFAULT 'pending' COMMENT '状态',
        credited_at TIMESTAMP NULL COMMENT '入账时间',
        credited_by BIGINT COMMENT '入账操作人ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES referral_campaigns(id),
        FOREIGN KEY (referrer_user_id) REFERENCES users(id),
        FOREIGN KEY (referee_user_id) REFERENCES users(id),
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (credited_by) REFERENCES admin_users(id),
        INDEX idx_referrer_user_id (referrer_user_id),
        INDEX idx_referee_user_id (referee_user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ 推荐奖励表 (referral_rewards) 创建成功');

    console.log('🎉 所有数据库表创建成功！');
    
    // 显示创建的表
    const [tables] = await connection.query("SHOW TABLES;");
    console.log('📋 数据库中现有表:', tables.map(row => Object.values(row)[0]));
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

initializeDatabaseStepByStep()
  .then(() => console.log('数据库初始化完成'))
  .catch(err => console.error('数据库初始化过程中发生错误:', err));