/**
 * 在后端目录中测试订单列表功能
 */
require('dotenv').config({ path: './.env' });
const Order = require('./models/Order');

async function testOrderListInBackend() {
  console.log('🔍 在后端目录中测试订单列表功能...');

  try {
    // 测试条件
    const conditions = { 
      tenant_id: 5,           // TEST_TENANT的ID
      assignee_user_id: 5     // 工人ID 5
    };
    const options = { 
      limit: 10, 
      offset: 0 
    };
    const tenantCode = 'TEST_TENANT';

    console.log('条件:', conditions);
    console.log('选项:', options);
    console.log('租户代码:', tenantCode);

    const result = await Order.list(conditions, options, tenantCode);
    console.log('✅ 查询成功，返回', result.rows.length, '条记录，总计', result.total, '条');
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

testOrderListInBackend();