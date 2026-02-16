/**
 * 详细测试订单创建过程
 */
require('dotenv').config({ path: './backend/.env' });
const OrderController = require('./backend/controllers/OrderController');

// 模拟请求对象
const mockReq = {
  body: {
    customer_name: '详细测试客户',
    phone: '13800138008',
    address: '北京市西城区详细测试街102号',
    title: '详细测试订单 - 搬运测试',
    description: '用于详细测试订单创建功能',
    pickup_address: '北京市西城区详细测试街102号',
    delivery_address: '北京市东城区详细交付路303号',
    distance: 15.0,
    weight: 180,
    volume: 3.5,
    amount: 120.00
  },
  tenantCode: 'TEST_TENANT',
  currentTenant: { id: 5, name: '测试租户', tenant_code: 'TEST_TENANT' },
  user: { userId: 4, username: 'test_admin', role: 'tenant_admin' }
};

// 模拟响应对象
const mockRes = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log('响应数据:', data);
  },
  statusCode: null
};

console.log('🔍 详细测试订单创建过程...');

// 测试OrderController.create方法
OrderController.create(mockReq, mockRes)
  .then(() => {
    console.log('✅ 订单创建测试完成');
  })
  .catch(error => {
    console.error('❌ 订单创建测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
  });