/**
 * 填充管理后台测试数据
 */
require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createTestData() {
  console.log('🚀 开始创建管理后台测试数据...');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'XIAOYI',
      charset: 'utf8mb4'
    });

    console.log('✅ 数据库连接成功');

    // 1. 创建推荐记录表
    console.log('\n📋 创建推荐记录表...');
    await connection.execute('DROP TABLE IF EXISTS referrals');
    await connection.execute(`
      CREATE TABLE referrals (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        campaign_id BIGINT NOT NULL,
        referrer_user_id BIGINT NOT NULL,
        referee_user_id BIGINT NOT NULL,
        status ENUM('pending', 'confirmed', 'rewarded', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_campaign (campaign_id),
        INDEX idx_referrer (referrer_user_id),
        INDEX idx_referee (referee_user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 推荐记录表创建成功');

    // 2. 创建推荐奖励记录表
    console.log('\n📋 创建推荐奖励记录表...');
    await connection.execute('DROP TABLE IF EXISTS referral_rewards');
    await connection.execute(`
      CREATE TABLE referral_rewards (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        referral_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        reward_type ENUM('referrer', 'referee') NOT NULL,
        reward_amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
        paid_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_referral (referral_id),
        INDEX idx_user (user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 推荐奖励记录表创建成功');

    // 3. 创建提现记录表
    console.log('\n📋 创建提现记录表...');
    await connection.execute('DROP TABLE IF EXISTS withdrawals');
    await connection.execute(`
      CREATE TABLE withdrawals (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'approved', 'processing', 'completed', 'rejected') DEFAULT 'pending',
        bank_name VARCHAR(100),
        bank_account VARCHAR(50),
        account_name VARCHAR(100),
        remark TEXT,
        rejection_reason TEXT,
        processed_by BIGINT,
        processed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_status (status),
        INDEX idx_processed_by (processed_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 提现记录表创建成功');

    // 4. 创建佣金记录表
    console.log('\n📋 创建佣金记录表...');
    await connection.execute('DROP TABLE IF EXISTS commissions');
    await connection.execute(`
      CREATE TABLE commissions (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        order_id BIGINT NOT NULL,
        admin_user_id BIGINT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order (order_id),
        INDEX idx_admin (admin_user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 佣金记录表创建成功');

    // 5. 插入测试推荐记录
    console.log('\n📝 插入测试推荐记录...');
    const [referralsResult] = await connection.execute(`
      INSERT INTO referrals (campaign_id, referrer_user_id, referee_user_id, status)
      VALUES 
        (1, 4, 5, 'confirmed'),
        (1, 4, 12, 'confirmed'),
        (1, 14, 5, 'rewarded'),
        (1, 14, 12, 'pending')
    `);
    console.log(`✅ 插入了 ${referralsResult.affectedRows} 条推荐记录`);

    // 6. 插入测试推荐奖励记录
    console.log('\n📝 插入测试推荐奖励记录...');
    const [rewardsResult] = await connection.execute(`
      INSERT INTO referral_rewards (referral_id, user_id, reward_type, reward_amount, status, paid_at)
      VALUES 
        (1, 4, 'referrer', 10.00, 'paid', NOW()),
        (1, 5, 'referee', 5.00, 'paid', NOW()),
        (2, 4, 'referrer', 10.00, 'paid', NOW()),
        (2, 12, 'referee', 5.00, 'pending', NULL),
        (3, 14, 'referrer', 10.00, 'paid', NOW()),
        (3, 5, 'referee', 5.00, 'paid', NOW())
    `);
    console.log(`✅ 插入了 ${rewardsResult.affectedRows} 条推荐奖励记录`);

    // 7. 插入测试提现记录
    console.log('\n📝 插入测试提现记录...');
    const [withdrawalsResult] = await connection.execute(`
      INSERT INTO withdrawals (user_id, amount, status, bank_name, bank_account, account_name, remark)
      VALUES 
        (4, 100.00, 'pending', '中国银行', '6222021234567890123', '张三', '测试提现 1'),
        (4, 200.00, 'approved', '工商银行', '6222021234567890124', '张三', '测试提现 2'),
        (5, 50.00, 'processing', '建设银行', '6222021234567890125', '李四', '测试提现 3'),
        (12, 150.00, 'completed', '农业银行', '6222021234567890126', '王五', '测试提现 4'),
        (14, 300.00, 'rejected', '招商银行', '6222021234567890127', '赵六', '测试提现 5')
    `);
    console.log(`✅ 插入了 ${withdrawalsResult.affectedRows} 条提现记录`);

    // 8. 插入测试佣金记录
    console.log('\n📝 插入测试佣金记录...');
    const [commissionsResult] = await connection.execute(`
      INSERT INTO commissions (order_id, admin_user_id, amount, status, remark)
      VALUES 
        (1, 4, 50.00, 'paid', '订单 1 佣金'),
        (2, 4, 60.00, 'paid', '订单 2 佣金'),
        (3, 14, 70.00, 'pending', '订单 3 佣金'),
        (4, 14, 80.00, 'pending', '订单 4 佣金')
    `);
    console.log(`✅ 插入了 ${commissionsResult.affectedRows} 条佣金记录`);

    // 9. 更新系统配置表（如果存在）
    console.log('\n⚙️  检查系统配置表...');
    try {
      await connection.execute(`
        INSERT INTO system_configs (config_key, config_value, description)
        VALUES 
          ('withdrawal_min_amount', '50', '最小提现金额'),
          ('withdrawal_max_amount', '1000', '最大提现金额'),
          ('commission_rate', '0.1', '佣金比例'),
          ('referral_reward_enabled', '1', '启用推荐奖励')
        ON DUPLICATE KEY UPDATE 
          config_value = VALUES(config_value)
      `);
      console.log('✅ 系统配置更新成功');
    } catch (error) {
      console.log('⚠️  系统配置表不存在，跳过');
    }

    await connection.end();

    console.log('\n✅ 所有测试数据创建完成！');
    console.log('\n📊 数据统计:');
    console.log('  - 推荐记录：4 条');
    console.log('  - 推荐奖励记录：6 条');
    console.log('  - 提现记录：5 条');
    console.log('  - 佣金记录：4 条');
    console.log('\n🎯 现在可以测试以下 API:');
    console.log('  - GET /api/admin/referral/campaigns');
    console.log('  - GET /api/admin/referral/stats');
    console.log('  - GET /api/admin/referral/list');
    console.log('  - GET /api/admin/withdrawals');
    console.log('  - GET /api/admin/commissions');

  } catch (error) {
    console.error('❌ 创建测试数据失败:', error.message);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

createTestData();