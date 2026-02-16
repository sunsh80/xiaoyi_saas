/**
 * 测试订单创建
 */
require('dotenv').config({ path: './backend/.env' });
const Order = require('./backend/models/Order');

async function testOrderCreation() {
  console.log('🔍 测试订单创建...');

  try {
    const orderData = {
      tenant_id: 5,
      customer_name: '测试客户',
      phone: '13800138005',
      address: '北京市东城区测试街123号',
      title: '端到端测试订单',
      description: '用于测试订单发布和接单流程',
      pickup_address: '北京市东城区测试街123号',
      delivery_address: '北京市西城区交付路456号',
      distance: 5.5,
      weight: 80,
      volume: 1.5,
      amount: 60.00,
      status: 'pending',
      created_by: 4  // test_admin的ID
    };

    console.log('订单数据:', orderData);

    const orderId = await Order.create(orderData, 'TEST_TENANT');
    console.log('✅ 订单创建成功，ID:', orderId);
  } catch (error) {
    console.error('❌ 订单创建失败:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

testOrderCreation();