/**
 * 简单测试订单列表功能
 */
require('dotenv').config({ path: './.env' });
const Order = require('./models/Order');

async function simpleTest() {
  console.log('🔍 简单测试订单列表功能...');

  try {
    // 只用最基本的参数测试
    const result = await Order.list({ tenant_id: 5 }, { limit: 10, offset: 0 }, 'TEST_TENANT');
    console.log('✅ 基本查询成功，返回', result.rows.length, '条记录，总计', result.total, '条');
  } catch (error) {
    console.error('❌ 基本查询失败:', error.message);
    console.error('错误堆栈:', error.stack);
  }

  try {
    // 测试带assignee过滤的查询
    const result = await Order.list({ 
      tenant_id: 5, 
      assignee_user_id: 5 
    }, { limit: 10, offset: 0 }, 'TEST_TENANT');
    console.log('✅ 带接单人过滤查询成功，返回', result.rows.length, '条记录，总计', result.total, '条');
  } catch (error) {
    console.error('❌ 带接单人过滤查询失败:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

simpleTest();