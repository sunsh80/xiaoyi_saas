/**
 * 测试地图服务API
 */
const axios = require('axios');

async function testMapAPI() {
  console.log('🔍 测试地图服务API...');

  try {
    // 获取工人账户的令牌
    const loginResponse = await axios.post('http://localhost:4002/api/auth/login', {
      username: 'test_worker',
      password: 'password123'
    }, {
      headers: {
        'x-tenant-code': 'TEST_TENANT',
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ 登录成功');
    const token = loginResponse.data.data.token;

    // 测试地址搜索API
    console.log('\\n🔍 测试地址搜索API...');
    const searchResponse = await axios.get('http://localhost:4002/api/map/search-address?keyword=北京', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-code': 'TEST_TENANT',
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ 地址搜索API响应:', searchResponse.data);

    // 测试获取工人位置API
    console.log('\\n🔍 测试获取工人位置API...');
    const locationResponse = await axios.get('http://localhost:4002/api/workers/5/location', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-code': 'TEST_TENANT',
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ 获取工人位置API响应:', locationResponse.data);

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testMapAPI();