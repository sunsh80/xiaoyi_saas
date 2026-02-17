/**
 * 财务和抽佣配置功能 - 数据库迁移脚本
 */
require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');

async function runMigration() {
  console.log('🚀 开始执行数据库迁移...\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'XIAOYI',
      charset: 'utf8mb4'
    });

    console.log('✅ 数据库连接成功\n');

    // 1. 创建系统配置表
    console.log('📋 创建系统配置表 (system_configs)...');
    await connection.execute('DROP TABLE IF EXISTS system_configs');
    await connection.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 系统配置表创建成功\n');

    // 2. 创建订单费用表
    console.log('📋 创建订单费用表 (order_fees)...');
    await connection.execute('DROP TABLE IF EXISTS order_fees');
    await connection.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 订单费用表创建成功\n');

    // 3. 扩展账户表
    console.log('📋 扩展账户表 (accounts)...');
    try {
      await connection.execute(`
        ALTER TABLE accounts 
        ADD COLUMN account_type ENUM('platform', 'tenant', 'user', 'worker') DEFAULT 'user'
      `);
      console.log('✅ 添加 account_type 字段成功');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  account_type 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE accounts ADD INDEX idx_type (account_type)
      `);
      console.log('✅ 添加 account_type 索引成功\n');
    } catch (error) {
      // 错误代码可能是字符串或数字，需要检查错误消息
      const errorMsg = error.message || '';
      if (error.code === 'ER_DUP_KEY' || error.code === 1061 || errorMsg.includes('Duplicate key')) {
        console.log('⚠️  idx_type 索引已存在，跳过\n');
      } else if (error.code === 'ER_DUP_FIELDNAME' || error.code === 1060 || errorMsg.includes('Duplicate column')) {
        console.log('⚠️  account_type 字段已存在，索引可能也已存在，跳过\n');
      } else {
        console.log('⚠️  索引创建失败:', error.message, '\n');
      }
    }

    // 4. 初始化系统配置数据
    console.log('📝 初始化系统配置数据...');
    await connection.execute(`
      INSERT INTO system_configs (config_key, config_value, config_type, description)
      VALUES 
        ('commission_rate', '0.1000', 'number', '默认抽佣比例 10%'),
        ('service_fee_rate', '0.0500', 'number', '服务费比例 5%'),
        ('service_fee_min', '5.00', 'number', '最低服务费 5 元'),
        ('service_fee_max', '100.00', 'number', '最高服务费 100 元'),
        ('information_fee', '2.00', 'number', '信息费 2 元'),
        ('insurance_fee_rate', '0.0100', 'number', '保险费比例 1%'),
        ('insurance_fee_min', '1.00', 'number', '最低保险费 1 元'),
        ('insurance_fee_max', '50.00', 'number', '最高保险费 50 元'),
        ('platform_gmv_formula', 'SUM(orders.amount) WHERE orders.status="completed"', 'string', '平台 GMV 计算公式'),
        ('platform_revenue_formula', 'SUM(order_fees.total_fee)', 'string', '平台收入计算公式')
      ON DUPLICATE KEY UPDATE 
        config_value = VALUES(config_value),
        description = VALUES(description)
    `);
    console.log('✅ 系统配置数据初始化成功\n');

    // 5. 创建平台账户（如果不存在）
    console.log('📝 创建平台账户...');
    const [platformTenant] = await connection.execute(`
      SELECT id FROM tenants WHERE tenant_code = 'default' LIMIT 1
    `);

    if (platformTenant.length > 0) {
      const platformTenantId = platformTenant[0].id;
      await connection.execute(`
        INSERT INTO accounts (tenant_id, user_id, balance, frozen_amount, account_type, created_at, updated_at)
        VALUES (?, NULL, 0, 0, 'platform', NOW(), NOW())
        ON DUPLICATE KEY UPDATE account_type = 'platform'
      `, [platformTenantId]);
      console.log('✅ 平台账户创建成功\n');
    } else {
      console.log('⚠️  未找到默认租户，跳过平台账户创建\n');
    }

    await connection.end();

    console.log('✅ 所有数据库迁移完成！\n');
    console.log('📊 迁移统计:');
    console.log('  - 新建表：2 个 (system_configs, order_fees)');
    console.log('  - 修改表：1 个 (accounts)');
    console.log('  - 初始化配置：10 条');
    console.log('  - 创建账户：1 个 (平台账户)');

  } catch (error) {
    console.error('❌ 数据库迁移失败:', error.message);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

runMigration();