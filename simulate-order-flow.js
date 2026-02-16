/**
 * 小蚁搬运平台订单流转模拟脚本
 * 模拟完整的订单生命周期：下单 -> 分配 -> 开始 -> 完成
 */

require('dotenv').config({ path: './backend/.env' });
const axios = require('axios');

// API基础配置
const BASE_URL = 'http://localhost:4000';
const TENANT_CODE = 'TEST_TENANT';

// 测试账户信息
const TEST_ACCOUNTS = {
  admin: {
    username: 'test_admin',
    password: 'password123',
    role: 'tenant_admin'
  },
  worker: {
    username: 'test_worker',
    password: 'password123',
    role: 'worker'
  }
};

// 模拟订单数据
const ORDER_DATA = {
  customer_name: '张三',
  phone: '13800138000',
  address: '北京市朝阳区测试街道123号',
  title: '模拟订单 - 搬运家具',
  description: '从A地搬到B地，包含沙发、桌子等家具',
  pickup_address: '北京市朝阳区测试街道123号',
  delivery_address: '北京市海淀区测试路456号',
  pickup_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 一天后
  delivery_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 两天后
  distance: 15.5,
  weight: 200,
  volume: 5.0,
  amount: 150.00,
  items: [
    { name: '沙发', quantity: 1, weight: 50, volume: 2.0 },
    { name: '餐桌', quantity: 1, weight: 30, volume: 1.5 }
  ],
  notes: '小心搬运，物品较重'
};

// 存储模拟过程中的数据
let tokens = {};
let createdOrder = null;

async function simulateOrderFlow() {
  console.log('🚚 开始模拟小蚁搬运平台订单流转过程...\n');

  try {
    // 1. 管理员登录
    console.log('🔐 步骤1: 管理员登录...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: TEST_ACCOUNTS.admin.username,
      password: TEST_ACCOUNTS.admin.password
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-code': TENANT_CODE
      }
    });
    
    tokens.admin = adminLoginResponse.data.data.token;
    console.log('✅ 管理员登录成功\n');

    // 2. 工人登录
    console.log('🔐 步骤2: 工人登录...');
    const workerLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: TEST_ACCOUNTS.worker.username,
      password: TEST_ACCOUNTS.worker.password
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-code': TENANT_CODE
      }
    });
    
    tokens.worker = workerLoginResponse.data.data.token;
    console.log('✅ 工人登录成功\n');

    // 3. 管理员创建订单
    console.log('📝 步骤3: 管理员创建订单...');
    const createOrderResponse = await axios.post(`${BASE_URL}/api/orders`, ORDER_DATA, {
      headers: {
        'Authorization': `Bearer ${tokens.admin}`,
        'Content-Type': 'application/json',
        'x-tenant-code': TENANT_CODE
      }
    });
    
    createdOrder = createOrderResponse.data.data;
    console.log(`✅ 订单创建成功，订单ID: ${createdOrder.id}\n`);

    // 4. 工人获取订单列表（应该能看到刚创建的订单）
    console.log('📋 步骤4: 工人获取订单列表...');
    const ordersResponse = await axios.get(`${BASE_URL}/api/orders`, {
      headers: {
        'Authorization': `Bearer ${tokens.worker}`,
        'Content-Type': 'application/json',
        'x-tenant-code': TENANT_CODE
      }
    });
    
    console.log(`✅ 获取到 ${ordersResponse.data.data.list.length} 个订单\n`);

    // 5. 工人接单（分配订单）
    console.log('🤝 步骤5: 工人接单（分配订单）...');
    const assignOrderResponse = await axios.put(`${BASE_URL}/api/orders/${createdOrder.id}/assign`, {}, {
      headers: {
        'Authorization': `Bearer ${tokens.worker}`,
        'Content-Type': 'application/json',
        'x-tenant-code': TENANT_CODE
      }
    });
    
    console.log('✅ 订单分配成功\n');

    // 6. 工人开始订单
    console.log('🏃‍♂️ 步骤6: 工人开始处理订单...');
    const startOrderResponse = await axios.put(`${BASE_URL}/api/orders/${createdOrder.id}/start`, {}, {
      headers: {
        'Authorization': `Bearer ${tokens.worker}`,
        'Content-Type': 'application/json',
        'x-tenant-code': TENANT_CODE
      }
    });
    
    console.log('✅ 订单开始处理\n');

    // 7. 工人完成订单
    console.log('✅ 步骤7: 工人完成订单...');
    const completeOrderResponse = await axios.put(`${BASE_URL}/api/orders/${createdOrder.id}/complete`, {}, {
      headers: {
        'Authorization': `Bearer ${tokens.worker}`,
        'Content-Type': 'application/json',
        'x-tenant-code': TENANT_CODE
      }
    });
    
    console.log('✅ 订单完成\n');

    // 8. 工人查看自己的订单历史
    console.log('📊 步骤8: 工人查看自己的订单历史...');
    const workerOrdersResponse = await axios.get(`${BASE_URL}/api/orders`, {
      params: {
        status: 'completed'
      },
      headers: {
        'Authorization': `Bearer ${tokens.worker}`,
        'Content-Type': 'application/json',
        'x-tenant-code': TENANT_CODE
      }
    });
    
    console.log(`✅ 工人获取到 ${workerOrdersResponse.data.data.list.length} 个已完成订单\n`);

    // 9. 查看订单详情
    console.log('🔍 步骤9: 查看订单详情...');
    const orderDetailResponse = await axios.get(`${BASE_URL}/api/orders/${createdOrder.id}`, {
      headers: {
        'Authorization': `Bearer ${tokens.worker}`,
        'Content-Type': 'application/json',
        'x-tenant-code': TENANT_CODE
      }
    });
    
    console.log('✅ 订单详情获取成功');
    console.log('订单状态:', orderDetailResponse.data.data.order.status);
    console.log('订单金额:', orderDetailResponse.data.data.order.amount);
    console.log('订单标题:', orderDetailResponse.data.data.order.title);
    console.log('');

    // 10. 查看工人统计信息
    console.log('📈 步骤10: 查看工人统计信息...');
    const workerStatsResponse = await axios.get(`${BASE_URL}/api/orders`, {
      headers: {
        'Authorization': `Bearer ${tokens.worker}`,
        'Content-Type': 'application/json',
        'x-tenant-code': TENANT_CODE
      }
    });
    
    // 统计订单数量
    const orders = workerStatsResponse.data.data.list;
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      assigned: orders.filter(o => o.status === 'assigned').length,
      inProgress: orders.filter(o => o.status === 'in_progress').length,
      completed: orders.filter(o => o.status === 'completed').length
    };
    
    console.log('工人订单统计:');
    console.log('- 总订单数:', stats.total);
    console.log('- 待处理:', stats.pending);
    console.log('- 已分配:', stats.assigned);
    console.log('- 进行中:', stats.inProgress);
    console.log('- 已完成:', stats.completed);
    console.log('');

    console.log('🎉 订单流转模拟完成！');
    console.log('整个流程已成功执行：下单 -> 分配 -> 开始 -> 完成');
    console.log('工人端数据已更新，订单状态为已完成');
    
  } catch (error) {
    console.error('❌ 模拟过程中发生错误:', error.response?.data || error.message);
    console.error('错误详情:', error.stack);
  }
}

// 运行模拟
simulateOrderFlow();