/**
 * 创建测试用户脚本
 * 用于创建两个测试登录账户
 */

require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createTestUsers() {
  console.log('🚀 开始创建测试用户...');

  try {
    // 连接到数据库
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password', // 使用项目配置的密码
      database: process.env.DB_NAME || 'XIAOYI',
      charset: 'utf8mb4'
    });

    console.log('✅ 数据库连接成功');

    // 创建租户（如果不存在）
    const createTenantSQL = `
      INSERT IGNORE INTO tenants (tenant_code, name, contact_person, contact_phone, email, address, status)
      VALUES
        ('TEST_TENANT', '测试租户', 'Test Admin', '13800138000', 'test@example.com', '测试地址', 1),
        ('DEV_TENANT', '开发租户', 'Dev Admin', '13900139000', 'dev@example.com', '开发地址', 1);
    `;

    await connection.query(createTenantSQL);
    console.log('✅ 测试租户创建完成');

    // 获取租户ID
    const [tenants] = await connection.query(
      'SELECT id, tenant_code FROM tenants WHERE tenant_code IN (?, ?)',
      ['TEST_TENANT', 'DEV_TENANT']
    );

    const testTenantId = tenants.find(t => t.tenant_code === 'TEST_TENANT')?.id;
    const devTenantId = tenants.find(t => t.tenant_code === 'DEV_TENANT')?.id;

    if (!testTenantId || !devTenantId) {
      throw new Error('无法获取租户ID');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 创建测试用户1 - 租户管理员角色
    const [testAdminResult] = await connection.execute(
      `INSERT INTO users (tenant_id, username, password_hash, phone, email, real_name, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testTenantId,
        'test_admin',
        hashedPassword,
        '13800138001',
        'test_admin@example.com',
        '测试管理员',
        'tenant_admin',
        1
      ]
    );
    console.log('✅ 测试租户管理员用户创建完成: test_admin');

    // 创建测试用户2 - 工人角色
    const [testWorkerResult] = await connection.execute(
      `INSERT INTO users (tenant_id, username, password_hash, phone, email, real_name, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testTenantId,
        'test_worker',
        hashedPassword,
        '13800138002',
        'test_worker@example.com',
        '测试工人',
        'worker',
        1
      ]
    );
    console.log('✅ 测试工人用户创建完成: test_worker');

    // 创建开发用户1 - 租户用户
    const [devUserResult] = await connection.execute(
      `INSERT INTO users (tenant_id, username, password_hash, phone, email, real_name, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        devTenantId,
        'dev_user',
        hashedPassword,
        '13900139001',
        'dev_user@example.com',
        '开发用户',
        'tenant_user',
        1
      ]
    );
    console.log('✅ 开发租户用户创建完成: dev_user');

    // 创建开发用户2 - 租户管理员
    const [devAdminResult] = await connection.execute(
      `INSERT INTO users (tenant_id, username, password_hash, phone, email, real_name, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        devTenantId,
        'dev_admin',
        hashedPassword,
        '13900139002',
        'dev_admin@example.com',
        '开发管理员',
        'tenant_admin',
        1
      ]
    );
    console.log('✅ 开发租户管理员用户创建完成: dev_admin');

    // 为用户创建账户
    const createUserAccountsSQL = `
      INSERT IGNORE INTO accounts (user_id, balance, created_at)
      SELECT id, 1000.00, NOW()
      FROM users
      WHERE username IN ('test_admin', 'test_worker', 'dev_user', 'dev_admin');
    `;

    await connection.query(createUserAccountsSQL);
    console.log('✅ 用户账户创建完成');

    // 显示创建的用户
    const [createdUsers] = await connection.query(`
      SELECT
        u.id,
        u.username,
        u.phone,
        u.real_name,
        u.role,
        t.name AS tenant_name,
        t.tenant_code
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.username LIKE 'test_%' OR u.username LIKE 'dev_%'
    `);

    console.log('\n📋 创建的测试用户列表:');
    console.table(createdUsers);

    await connection.end();
    console.log('\n🎉 测试用户创建完成！');

    console.log('\n🔐 测试账户信息:');
    console.log('账号1: test_admin / password123 (管理员)');
    console.log('账号2: test_worker / password123 (工人)');
    console.log('账号3: dev_user / password123 (租户用户)');
    console.log('账号4: dev_admin / password123 (开发管理员)');

  } catch (error) {
    console.error('❌ 创建测试用户失败:', error.message);
    process.exit(1);
  }
}

// 执行创建测试用户
createTestUsers();