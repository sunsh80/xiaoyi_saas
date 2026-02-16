/**
 * 检查系统架构和租户管理功能
 */
require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');

async function checkSystemArchitecture() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'XIAOYI',
    charset: 'utf8mb4'
  });

  // 1. 检查所有租户
  console.log('\n🏢 系统租户列表:');
  const [tenants] = await connection.execute('SELECT * FROM tenants ORDER BY id');
  console.table(tenants.map(t => ({
    id: t.id,
    tenant_code: t.tenant_code,
    name: t.name,
    status: t.status,
    contact_person: t.contact_person
  })));

  // 2. 检查所有用户角色
  console.log('\n👥 系统用户角色分布:');
  const [roles] = await connection.execute(`
    SELECT role, COUNT(*) as count 
    FROM users 
    GROUP BY role
  `);
  console.table(roles);

  // 3. 查找超级管理员或平台管理员
  console.log('\n🔐 查找平台级管理员:');
  const [platformAdmins] = await connection.execute(`
    SELECT u.id, u.username, u.real_name, u.role, u.phone
    FROM users u
    WHERE u.role IN ('admin', 'platform_admin', 'super_admin')
    ORDER BY u.id
  `);
  console.table(platformAdmins);

  // 4. 检查数据库表结构
  console.log('\n📋 系统主要数据表:');
  const [tables] = await connection.execute(`
    SHOW TABLES
  `);
  const tableList = tables.map(t => Object.values(t)[0]);
  console.log(tableList.join(', '));

  await connection.end();
}

checkSystemArchitecture();