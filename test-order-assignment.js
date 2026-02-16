/**
 * 测试订单分配功能
 */
require('dotenv').config({ path: './backend/.env' });
const Order = require('./backend/models/Order');
const User = require('./backend/models/User');

async function testOrderAssignment() {
  console.log('🔍 测试订单分配功能...');

  try {
    // 首先获取订单
    const order = await Order.findById(10, 'TEST_TENANT');
    console.log('订单信息:', order);

    if (!order) {
      console.log('❌ 订单不存在');
      return;
    }

    if (order.status !== 'pending') {
      console.log('❌ 订单状态不是待处理状态');
      return;
    }

    // 获取用户
    const user = await User.findById(5, 'TEST_TENANT'); // test_worker的ID
    console.log('用户信息:', user);

    if (!user) {
      console.log('❌ 用户不存在');
      return;
    }

    if (user.role !== 'worker') {
      console.log('❌ 用户角色不是工人');
      return;
    }

    // 尝试更新订单状态
    console.log('尝试更新订单状态...');
    const result = await Order.update(10, {
      status: 'assigned',
      assignee_user_id: 5
    }, 'TEST_TENANT');

    console.log('✅ 订单分配成功');
    console.log('更新后的订单:', result);
  } catch (error) {
    console.error('❌ 订单分配失败:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

testOrderAssignment();