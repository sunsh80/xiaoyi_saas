/**
 * 验证用户信息
 */
require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');

async function verifyUserInfo() {
  console.log('🔍 验证用户信息...');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'XIAOYI',
      charset: 'utf8mb4'
    });

    // 检查TEST_TENANT租户下的所有用户
    const [users] = await connection.execute(
      'SELECT id, username, tenant_id, role FROM users WHERE tenant_id = (SELECT id FROM tenants WHERE tenant_code = ?)',
      ['TEST_TENANT']
    );
    console.log('\n👥 TEST_TENANT租户下的用户:');
    console.table(users);

    // 检查tenant1租户下的所有用户
    const [users2] = await connection.execute(
      'SELECT id, username, tenant_id, role FROM users WHERE tenant_id = (SELECT id FROM tenants WHERE tenant_code = ?)',
      ['tenant1']
    );
    console.log('\n👥 tenant1租户下的用户:');
    console.table(users2);

    await connection.end();
    console.log('\n✅ 验证完成');
  } catch (error) {
    console.error('❌ 验证过程中出错:', error.message);
  }
}

verifyUserInfo();