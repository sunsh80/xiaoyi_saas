/**
 * 为租户二创建管理员账户
 */
require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createTenant2Admin() {
  console.log('🔧 为租户二创建管理员账户...');

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
      ['test_admin', tenantId]
    );

    if (existingUsers.length > 0) {
      console.log('⚠️ 租户二的test_admin账户已存在');
      await connection.end();
      return;
    }

    // 加密密码
    const passwordHash = await bcrypt.hash('password123', 10);

    // 创建管理员账户
    const [result] = await connection.execute(
      `INSERT INTO users 
      (tenant_id, username, password_hash, phone, email, real_name, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        'test_admin',
        passwordHash,
        '13800138001',  // 管理员使用不同的手机号
        'test_admin_tenant2@example.com',
        '租户二测试管理员',
        'tenant_admin',
        1
      ]
    );

    console.log(`✅ 成功创建租户二的管理员账户，ID: ${result.insertId}`);

    // 为用户创建账户记录
    await connection.execute(
      `INSERT INTO accounts (user_id, balance, created_at) VALUES (?, ?, NOW())`,
      [result.insertId, 1000.00]
    );

    console.log('✅ 为管理员账户创建了资金账户');

    await connection.end();
    console.log('✅ 租户二管理员账户创建完成');
  } catch (error) {
    console.error('❌ 创建租户二管理员账户失败:', error.message);
  }
}

createTenant2Admin();