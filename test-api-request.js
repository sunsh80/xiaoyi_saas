/**
 * 测试API请求格式
 */
require('dotenv').config({ path: './backend/.env' });
const axios = require('axios');

async function testApiRequest() {
  console.log('🔍 测试API请求格式...');

  try {
    const response = await axios.post('http://localhost:4000/api/auth/login', {
      username: 'test_admin',
      password: 'password123'
    }, {
      headers: {
        'x-tenant-code': 'TEST_TENANT',
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ 登录成功');
    const token = response.data.data.token;

    // 尝试创建订单
    const orderResponse = await axios.post('http://localhost:4000/api/orders', {
      customer_name: 'API测试客户',
      phone: '13800138007',
      address: '北京市海淀区API测试街101号',
      title: 'API测试订单 - 搬运测试',
      description: '用于测试API订单创建功能',
      pickup_address: '北京市海淀区API测试街101号',
      delivery_address: '北京市朝阳区API交付路203号',
      distance: 12.5,
      weight: 150,
      volume: 2.0,
      amount: 90.00
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-code': 'TEST_TENANT',
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ 订单创建成功:', orderResponse.data);
  } catch (error) {
    console.error('❌ API请求失败:', error.response?.data || error.message);
    console.error('错误详情:', error.response?.status, error.response?.statusText);
  }
}

testApiRequest();