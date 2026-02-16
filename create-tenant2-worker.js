/**
 * 为租户二创建工人账户
 */
require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createTenant2Worker() {
  console.log('🔧 为租户二创建工人账户...');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'XIAOYI',
      charset: 'utf8mb4'
    });

    // 获取租户二的ID
    const [tenants] = await connection.execute(
      'SELECT id FROM tenants WHERE tenant_code = ?',
      ['tenant2']
    );

    if (tenants.length === 0) {
      console.log('❌ 租户二不存在');
      await connection.end();
      return;
    }

    const tenantId = tenants[0].id;
    console.log(`✅ 找到租户二，ID: ${tenantId}`);

    // 检查是否已存在该用户
    const [existingUsers] = await connection.execute(
      'SELECT id FROM users WHERE username = ? AND tenant_id = ?',
      ['test_worker', tenantId]
    );

    if (existingUsers.length > 0) {
      console.log('⚠️ 租户二的test_worker账户已存在');
      await connection.end();
      return;
    }

    // 加密密码
    const passwordHash = await bcrypt.hash('password123', 10);

    // 创建工人账户
    const [result] = await connection.execute(
      `INSERT INTO users 
      (tenant_id, username, password_hash, phone, email, real_name, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        'test_worker',
        passwordHash,
        '13800138002',  // 使用您提到的手机号
        'test_worker_tenant2@example.com',
        '租户二测试工人',
        'worker',
        1
      ]
    );

    console.log(`✅ 成功创建租户二的工人账户，ID: ${result.insertId}`);

    // 为用户创建账户记录
    await connection.execute(
      `INSERT INTO accounts (user_id, balance, created_at) VALUES (?, ?, NOW())`,
      [result.insertId, 1000.00]
    );

    console.log('✅ 为工人账户创建了资金账户');

    await connection.end();
    console.log('✅ 租户二工人账户创建完成');
  } catch (error) {
    console.error('❌ 创建租户二工人账户失败:', error.message);
  }
}

createTenant2Worker();