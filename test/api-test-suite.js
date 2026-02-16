/**
 * 小蚁搬运API测试套件
 * 用于验证前后端API的一致性、登录流畅性和整体连通性
 */

const axios = require('axios');
require('dotenv').config();

// 测试配置
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const TEST_TENANT_CODE = 'test_tenant';
const TEST_USER = {
  username: 'test_user_' + Date.now(),
  password: 'TestPass123!',
  phone: '13800138000',
  real_name: '测试用户',
  role: 'worker'
};

// 存储测试过程中的数据
let testData = {
  token: null,
  userId: null,
  orderId: null,
  referralCode: null,
  campaignId: null
};

// API测试类
class APITestSuite {
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'x-tenant-code': TEST_TENANT_CODE,
        'Content-Type': 'application/json'
      }
    });
  }

  // 通用请求方法
  async request(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: endpoint,
        headers: { ...this.client.defaults.headers.common, ...headers }
      };

      if (data) {
        config.data = data;
      }

      if (testData.token) {
        config.headers.Authorization = `Bearer ${testData.token}`;
      }

      const response = await this.client(config);
      console.log(`✅ ${method.toUpperCase()} ${endpoint} - 状态码: ${response.status}`);
      return response;
    } catch (error) {
      console.error(`❌ ${method.toUpperCase()} ${endpoint} - 错误:`, error.response?.data || error.message);
      throw error;
    }
  }

  // 1. 测试认证相关API
  async testAuthAPIs() {
    console.log('\n🔍 开始测试认证相关API...\n');

    // 1.1 测试用户注册
    console.log('📝 测试用户注册...');
    try {
      const registerResponse = await this.request('POST', '/auth/register', {
        username: TEST_USER.username,
        password: TEST_USER.password,
        phone: TEST_USER.phone,
        real_name: TEST_USER.real_name,
        role: TEST_USER.role
      });
      
      if (registerResponse.data.success) {
        console.log('✅ 用户注册成功');
        testData.userId = registerResponse.data.data.user.id;
      } else {
        console.log('❌ 用户注册失败:', registerResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 用户注册测试失败:', error.message);
    }

    // 1.2 测试用户登录
    console.log('\n🔐 测试用户登录...');
    try {
      const loginResponse = await this.request('POST', '/auth/login', {
        username: TEST_USER.username,
        password: TEST_USER.password
      });
      
      if (loginResponse.data.success) {
        console.log('✅ 用户登录成功');
        testData.token = loginResponse.data.data.token;
        // 验证token是否有效
        this.client.defaults.headers.common['Authorization'] = `Bearer ${testData.token}`;
      } else {
        console.log('❌ 用户登录失败:', loginResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 用户登录测试失败:', error.message);
    }

    // 1.3 测试获取当前用户信息
    console.log('\n👤 测试获取当前用户信息...');
    try {
      const meResponse = await this.request('GET', '/auth/me');
      
      if (meResponse.data.success) {
        console.log('✅ 获取当前用户信息成功');
        console.log(`   用户ID: ${meResponse.data.data.user.id}`);
        console.log(`   用户名: ${meResponse.data.data.user.username}`);
        console.log(`   角色: ${meResponse.data.data.user.role}`);
      } else {
        console.log('❌ 获取当前用户信息失败:', meResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 获取当前用户信息测试失败:', error.message);
    }

    // 1.4 测试修改密码
    console.log('\n🔑 测试修改密码...');
    try {
      const changePasswordResponse = await this.request('PUT', '/auth/change-password', {
        oldPassword: TEST_USER.password,
        newPassword: 'NewTestPass456!'
      });
      
      if (changePasswordResponse.data.success) {
        console.log('✅ 修改密码成功');
        // 更新密码用于后续测试
        TEST_USER.password = 'NewTestPass456!';
      } else {
        console.log('❌ 修改密码失败:', changePasswordResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 修改密码测试失败:', error.message);
    }

    console.log('\n✅ 认证相关API测试完成\n');
  }

  // 2. 测试订单相关API
  async testOrderAPIs() {
    console.log('🔍 开始测试订单相关API...\n');

    // 2.1 测试创建订单
    console.log('📦 测试创建订单...');
    try {
      const orderData = {
        title: '测试订单 - ' + new Date().toISOString(),
        pickup_address: '北京市朝阳区测试地址123号',
        delivery_address: '北京市海淀区测试地址456号',
        amount: 150.00,
        description: '这是一笔测试订单',
        distance: 10.5,
        weight: 50.0
      };

      const createOrderResponse = await this.request('POST', '/orders', orderData);
      
      if (createOrderResponse.data.success) {
        console.log('✅ 创建订单成功');
        testData.orderId = createOrderResponse.data.data.order.id;
        console.log(`   订单ID: ${testData.orderId}`);
        console.log(`   订单号: ${createOrderResponse.data.data.order.order_no}`);
      } else {
        console.log('❌ 创建订单失败:', createOrderResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 创建订单测试失败:', error.message);
    }

    // 2.2 测试获取订单列表
    console.log('\n📋 测试获取订单列表...');
    try {
      const ordersResponse = await this.request('GET', '/orders?page=1&limit=10');
      
      if (ordersResponse.data.success) {
        console.log('✅ 获取订单列表成功');
        console.log(`   订单数量: ${ordersResponse.data.data.orders.length}`);
        console.log(`   总页数: ${ordersResponse.data.data.pagination.pages}`);
      } else {
        console.log('❌ 获取订单列表失败:', ordersResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 获取订单列表测试失败:', error.message);
    }

    // 2.3 测试获取订单详情
    if (testData.orderId) {
      console.log('\n🔍 测试获取订单详情...');
      try {
        const orderDetailResponse = await this.request('GET', `/orders/${testData.orderId}`);
        
        if (orderDetailResponse.data.success) {
          console.log('✅ 获取订单详情成功');
          console.log(`   订单状态: ${orderDetailResponse.data.data.order.status}`);
          console.log(`   订单金额: ¥${orderDetailResponse.data.data.order.amount}`);
        } else {
          console.log('❌ 获取订单详情失败:', orderDetailResponse.data.message);
        }
      } catch (error) {
        console.log('❌ 获取订单详情测试失败:', error.message);
      }
    }

    // 2.4 测试分配订单（如果适用）
    if (testData.orderId) {
      console.log('\n📍 测试分配订单...');
      try {
        const assignResponse = await this.request('PUT', `/orders/${testData.orderId}/assign`);
        
        if (assignResponse.data.success) {
          console.log('✅ 分配订单成功');
          console.log(`   新状态: ${assignResponse.data.data.order.status}`);
        } else {
          console.log('⚠️  分配订单失败或不允许:', assignResponse.data.message);
        }
      } catch (error) {
        console.log('⚠️  分配订单测试失败（可能是业务逻辑限制）:', error.message);
      }
    }

    console.log('\n✅ 订单相关API测试完成\n');
  }

  // 3. 测试财务管理API
  async testFinanceAPIs() {
    console.log('💰 开始测试财务管理API...\n');

    // 3.1 测试获取账户信息
    console.log('💳 测试获取账户信息...');
    try {
      const accountResponse = await this.request('GET', '/finance/account');
      
      if (accountResponse.data.success) {
        console.log('✅ 获取账户信息成功');
        console.log(`   账户ID: ${accountResponse.data.data.account.id}`);
        console.log(`   余额: ¥${accountResponse.data.data.account.balance}`);
        console.log(`   可用余额: ¥${accountResponse.data.data.account.available_balance}`);
      } else {
        console.log('❌ 获取账户信息失败:', accountResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 获取账户信息测试失败:', error.message);
    }

    // 3.2 测试获取支付记录列表
    console.log('\n💳 测试获取支付记录列表...');
    try {
      const paymentsResponse = await this.request('GET', '/finance/payments?page=1&limit=10');
      
      if (paymentsResponse.data.success) {
        console.log('✅ 获取支付记录列表成功');
        console.log(`   支付记录数量: ${paymentsResponse.data.data.payments.length}`);
      } else {
        console.log('❌ 获取支付记录列表失败:', paymentsResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 获取支付记录列表测试失败:', error.message);
    }

    // 3.3 测试申请提现（如果余额充足）
    console.log('\n💸 测试申请提现...');
    try {
      // 先检查账户余额
      const accountResponse = await this.request('GET', '/finance/account');
      const balance = accountResponse.data.data.account.available_balance;
      
      if (balance >= 10) { // 假设最低提现金额为10元
        const withdrawalResponse = await this.request('POST', '/finance/withdrawals', {
          amount: 10,
          account_info: {
            account_type: 'wechat_pay',
            account_number: 'test_wechat_account',
            account_name: TEST_USER.real_name
          },
          remark: '测试提现'
        });
        
        if (withdrawalResponse.data.success) {
          console.log('✅ 申请提现成功');
          console.log(`   提现ID: ${withdrawalResponse.data.data.withdrawal.id}`);
          console.log(`   提现金额: ¥${withdrawalResponse.data.data.withdrawal.amount}`);
        } else {
          console.log('❌ 申请提现失败:', withdrawalResponse.data.message);
        }
      } else {
        console.log('⚠️  余额不足，跳过提现测试');
      }
    } catch (error) {
      console.log('❌ 申请提现测试失败:', error.message);
    }

    console.log('\n✅ 财务管理API测试完成\n');
  }

  // 4. 测试推荐拉新API
  async testReferralAPIs() {
    console.log('🎁 开始测试推荐拉新API...\n');

    // 4.1 测试获取推荐活动列表
    console.log('🎪 测试获取推荐活动列表...');
    try {
      const campaignsResponse = await this.request('GET', '/referral/campaigns');
      
      if (campaignsResponse.data.success) {
        console.log('✅ 获取推荐活动列表成功');
        console.log(`   活动数量: ${campaignsResponse.data.data.campaigns.length}`);
        
        if (campaignsResponse.data.data.campaigns.length > 0) {
          testData.campaignId = campaignsResponse.data.data.campaigns[0].id;
          console.log(`   使用活动ID: ${testData.campaignId}`);
        }
      } else {
        console.log('❌ 获取推荐活动列表失败:', campaignsResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 获取推荐活动列表测试失败:', error.message);
    }

    // 4.2 测试生成推荐链接
    if (testData.campaignId) {
      console.log('\n🔗 测试生成推荐链接...');
      try {
        const linkResponse = await this.request('POST', '/referral/generate-link', {
          campaignId: testData.campaignId
        });
        
        if (linkResponse.data.success) {
          console.log('✅ 生成推荐链接成功');
          testData.referralCode = linkResponse.data.data.referralCode;
          console.log(`   推荐码: ${testData.referralCode}`);
          console.log(`   推荐链接: ${linkResponse.data.data.referralLink}`);
        } else {
          console.log('❌ 生成推荐链接失败:', linkResponse.data.message);
        }
      } catch (error) {
        console.log('❌ 生成推荐链接测试失败:', error.message);
      }
    }

    // 4.3 测试获取推荐统计
    console.log('\n📊 测试获取推荐统计...');
    try {
      const statsResponse = await this.request('GET', '/referral/stats');
      
      if (statsResponse.data.success) {
        console.log('✅ 获取推荐统计成功');
        console.log(`   总推荐数: ${statsResponse.data.data.stats.total_referrals}`);
        console.log(`   已确认推荐数: ${statsResponse.data.data.stats.confirmed_referrals}`);
        console.log(`   已奖励推荐数: ${statsResponse.data.data.stats.rewarded_referrals}`);
      } else {
        console.log('❌ 获取推荐统计失败:', statsResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 获取推荐统计测试失败:', error.message);
    }

    // 4.4 测试获取总奖励金额
    console.log('\n💰 测试获取总奖励金额...');
    try {
      const rewardsResponse = await this.request('GET', '/referral/total-rewards');
      
      if (rewardsResponse.data.success) {
        console.log('✅ 获取总奖励金额成功');
        console.log(`   总奖励金额: ¥${rewardsResponse.data.data.totalRewards}`);
      } else {
        console.log('❌ 获取总奖励金额失败:', rewardsResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 获取总奖励金额测试失败:', error.message);
    }

    console.log('\n✅ 推荐拉新API测试完成\n');
  }

  // 5. 运行完整测试套件
  async runCompleteTest() {
    console.log('🚀 开始运行小蚁搬运API完整测试套件...\n');
    console.log(`📅 测试时间: ${new Date().toLocaleString()}`);
    console.log(`🌐 API基地址: ${BASE_URL}`);
    console.log(`🏢 租户代码: ${TEST_TENANT_CODE}`);
    console.log('');

    try {
      await this.testAuthAPIs();
      await this.testOrderAPIs();
      await this.testFinanceAPIs();
      await this.testReferralAPIs();

      console.log('🎉 所有API测试完成！');
      console.log('');
      console.log('📊 测试结果摘要:');
      console.log(`   用户ID: ${testData.userId || 'N/A'}`);
      console.log(`   订单ID: ${testData.orderId || 'N/A'}`);
      console.log(`   推荐码: ${testData.referralCode || 'N/A'}`);
      console.log(`   活动ID: ${testData.campaignId || 'N/A'}`);
      console.log('');
      console.log('✅ 测试完成！请检查以上各项测试结果。');
    } catch (error) {
      console.error('❌ 测试过程中发生错误:', error);
    }
  }
}

// 运行测试
if (require.main === module) {
  const testSuite = new APITestSuite();
  testSuite.runCompleteTest().catch(console.error);
}

module.exports = APITestSuite;