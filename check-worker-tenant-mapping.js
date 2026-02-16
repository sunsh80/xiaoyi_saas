/**
 * 检查工人账户与租户的对应关系
 */
require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');

async function checkWorkerTenantMapping() {
  console.log('🔍 检查工人账户与租户的对应关系...');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'XIAOYI',
      charset: 'utf8mb4'
    });

    // 查询所有工人账户及其租户信息
    const [workers] = await connection.execute(`
      SELECT u.id, u.username, u.role, u.real_name, u.phone, 
             t.id as tenant_id, t.name as tenant_name, t.tenant_code 
      FROM users u 
      JOIN tenants t ON u.tenant_id = t.id 
      WHERE u.role = 'worker' 
      ORDER BY u.id
    `);

    console.log('\n📋 工人账户与租户对应关系:');
    console.table(workers);

    // 查询所有租户信息
    const [tenants] = await connection.execute('SELECT * FROM tenants ORDER BY id');
    console.log('\n🏢 所有租户信息:');
    console.table(tenants);

    await connection.end();
    console.log('\n✅ 检查完成');
  } catch (error) {
    console.error('❌ 检查过程中出错:', error.message);
  }
}

checkWorkerTenantMapping();