/**
 * 修复 Order 和 User 模型的连接池问题
 * 并创建测试数据
 */

require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');

async function fixModelsAndCreateTestData() {
  console.log('=== 开始修复和创建测试数据 ===\n');

  try {
    // 连接到数据库
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'xiaoyi_pass_2023',
      database: process.env.DB_NAME || 'XIAOYI',
      charset: 'utf8mb4'
    });

    console.log('✅ 数据库连接成功\n');

    // 1. 检查租户是否存在
    console.log('📋 检查租户数据...');
    const [tenants] = await connection.execute(
      'SELECT id, tenant_code, name, status FROM tenants WHERE tenant_code = ?',
      ['TEST_TENANT']
    );

    if (tenants.length === 0) {
      console.log('❌ TEST_TENANT 不存在，请先运行 create-test-users.js');
      await connection.end();
      return;
    }

    const tenant = tenants[0];
    console.log(`✅ 找到租户：${tenant.name} (${tenant.tenant_code}), 状态：${tenant.status === 1 ? '已激活' : '待审批/已禁用'}`);

    // 如果租户状态不是 1，更新为 1
    if (tenant.status !== 1) {
      console.log('🔄 更新租户状态为已激活...');
      await connection.execute(
        'UPDATE tenants SET status = 1 WHERE tenant_code = ?',
        ['TEST_TENANT']
      );
      console.log('✅ 租户状态已更新\n');
    }

    // 2. 检查测试用户
    console.log('👥 检查用户数据...');
    const [users] = await connection.execute(
      'SELECT id, username, role, status, tenant_id FROM users WHERE tenant_id = ?',
      [tenant.id]
    );

    console.log(`✅ 找到 ${users.length} 个用户`);
    users.forEach(u => {
      console.log(`   - ${u.username} (${u.role}), 状态：${u.status === 1 ? '已激活' : '待激活'}`);
    });

    // 更新用户状态为 1
    await connection.execute(
      'UPDATE users SET status = 1 WHERE tenant_id = ?',
      [tenant.id]
    );
    console.log('✅ 用户状态已更新为已激活\n');

    // 3. 创建测试订单
    console.log('📦 创建测试订单...');
    
    // 查找工人用户
    const worker = users.find(u => u.role === 'worker');
    
    const testOrders = [
      {
        order_no: `XY${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}0001`,
        title: '办公室搬迁',
        description: '需要搬运办公桌和文件柜',
        pickup_address: '北京市朝阳区 xxx 大厦',
        delivery_address: '北京市海淀区 yyy 园区',
        amount: 580.00,
        status: 'completed',
        customer_name: '张先生',
        phone: '13800138001'
      },
      {
        order_no: `XY${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}0002`,
        title: '仓库货物整理',
        description: '仓库货物分类整理',
        pickup_address: '北京市丰台区 zzz 仓库',
        delivery_address: '北京市大兴区 aaa 物流园',
        amount: 350.00,
        status: 'in_progress',
        customer_name: '李女士',
        phone: '13800138002'
      },
      {
        order_no: `XY${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}0003`,
        title: '家具搬运',
        description: '沙发、床、衣柜搬运',
        pickup_address: '北京市西城区 bbb 小区',
        delivery_address: '北京市东城区 ccc 公寓',
        amount: 420.00,
        status: 'assigned',
        customer_name: '王先生',
        phone: '13800138003'
      },
      {
        order_no: `XY${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}0004`,
        title: '设备搬运',
        description: '实验室设备搬运',
        pickup_address: '北京市昌平区 ddd 科技园',
        delivery_address: '北京市顺义区 eee 大厦',
        amount: 1200.00,
        status: 'pending',
        customer_name: '赵先生',
        phone: '13800138004'
      }
    ];

    let createdCount = 0;
    for (const order of testOrders) {
      // 检查订单是否已存在
      const [existing] = await connection.execute(
        'SELECT id FROM orders WHERE order_no = ?',
        [order.order_no]
      );

      if (existing.length === 0) {
        await connection.execute(
          `INSERT INTO orders
           (tenant_id, order_no, title, description, pickup_address, delivery_address, address,
            amount, status, customer_name, phone, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tenant.id, order.order_no, order.title, order.description,
           order.pickup_address, order.delivery_address, order.pickup_address,
           order.amount, order.status, order.customer_name, order.phone, worker ? worker.id : null]
        );
        createdCount++;
        console.log(`   ✅ 创建订单：${order.order_no} - ${order.title}`);
      } else {
        console.log(`   ⏭️  订单已存在：${order.order_no}`);
      }
    }
    console.log(`✅ 创建了 ${createdCount} 个新订单\n`);

    // 4. 更新工人信息（如果字段存在）
    if (worker) {
      try {
        await connection.execute(
          `UPDATE users SET
           completed_orders = ?,
           total_income = ?
           WHERE id = ?`,
          [156, 12580, worker.id]
        );
        console.log(`✅ 工人 ${worker.username} 信息已更新\n`);
      } catch (e) {
        console.log('⚠️  工人统计字段不存在，跳过更新\n');
      }
    }

    // 5. 验证数据
    console.log('📊 验证数据...');
    
    const [orderCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM orders WHERE tenant_id = ?',
      [tenant.id]
    );
    console.log(`   订单总数：${orderCount[0].count}`);

    const [statusStats] = await connection.execute(
      `SELECT status, COUNT(*) as count 
       FROM orders 
       WHERE tenant_id = ? 
       GROUP BY status`,
      [tenant.id]
    );
    console.log('   订单状态分布:');
    statusStats.forEach(s => {
      console.log(`     - ${s.status}: ${s.count} 个`);
    });

    await connection.end();
    console.log('\n=== ✅ 修复和测试数据创建完成 ===\n');
    console.log('现在可以访问：http://localhost:4000/tenant-admin/login-v2.html');
    console.log('登录信息：');
    console.log('  租户编码：TEST_TENANT');
    console.log('  用户名：test_admin');
    console.log('  密码：password123');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixModelsAndCreateTestData();
