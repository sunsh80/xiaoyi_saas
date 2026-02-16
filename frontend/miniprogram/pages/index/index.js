// pages/index/index.js
const app = getApp();

Page({
  data: {
    // 轮播图配置
    indicatorDots: true,
    autoplay: true,
    interval: 3000,
    duration: 500,

    // 轮播图数据
    banners: [
      { id: 1, image: '/images/banner1.jpg', title: '专业搬运服务' },
      { id: 2, image: '/images/banner2.jpg', title: '快速响应' },
      { id: 3, image: '/images/banner3.jpg', title: '安全可靠' }
    ],

    // 订单统计数据
    stats: {
      pending: 0,
      assigned: 0,
      inProgress: 0,
      completed: 0
    },

    // 最近订单
    recentOrders: [],

    // 推荐活动
    referralCampaign: null
  },

  onLoad: function () {
    // 页面加载时获取数据
    this.fetchData();
  },

  onShow: function () {
    // 页面显示时刷新数据
    this.fetchData();
  },

  // 获取首页数据
  fetchData: function () {
    // 获取订单统计数据
    this.fetchOrderStats();

    // 获取最近订单
    this.fetchRecentOrders();

    // 获取推荐活动
    this.fetchReferralCampaign();
  },

  // 获取订单统计数据
  fetchOrderStats: function () {
    app.request({
      url: '/orders',
      method: 'GET',
      data: { limit: 100 }, // 获取所有订单用于统计
      success: (res) => {
        if (res.success) {
          const orders = res.data.orders || [];
          const stats = {
            pending: 0,
            assigned: 0,
            inProgress: 0,
            completed: 0
          };

          orders.forEach(order => {
            switch (order.status) {
              case 'pending':
                stats.pending++;
                break;
              case 'assigned':
                stats.assigned++;
                break;
              case 'in_progress':
                stats.inProgress++;
                break;
              case 'completed':
                stats.completed++;
                break;
            }
          });

          this.setData({ stats });
        }
      },
      fail: (err) => {
        console.error('获取订单统计数据失败', err);
      }
    });
  },

  // 获取最近订单
  fetchRecentOrders: function () {
    app.request({
      url: '/orders',
      method: 'GET',
      data: {
        limit: 5,
        page: 1
      },
      success: (res) => {
        if (res.success) {
          this.setData({
            recentOrders: res.data.orders || []
          });
        }
      },
      fail: (err) => {
        console.error('获取最近订单失败', err);
      }
    });
  },

  // 获取推荐活动
  fetchReferralCampaign: function () {
    app.request({
      url: '/referral/campaigns',
      method: 'GET',
      success: (res) => {
        if (res.success && res.data.campaigns && res.data.campaigns.length > 0) {
          // 获取第一个活动（可以是当前最活跃的活动）
          this.setData({
            referralCampaign: res.data.campaigns[0]
          });
        }
      },
      fail: (err) => {
        console.error('获取推荐活动失败', err);
      }
    });
  },


  // 轮播图点击事件
  onBannerTap: function (e) {
    const index = e.currentTarget.dataset.index;
    const banner = this.data.banners[index];
    // 可以根据轮播图内容执行相应操作
    console.log('轮播图被点击', banner);
  },

  // 查看订单详情
  viewOrderDetail: function (e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/orders/detail?id=${orderId}`
    });
  },

  // 联系客服
  onContactTap: function () {
    wx.makePhoneCall({
      phoneNumber: '400-123-4567' // 替换为实际客服电话
    });
  },

  // 状态文本转换
  getStatusText: function (status) {
    const statusMap = {
      'pending': '待分配',
      'assigned': '已分配',
      'in_progress': '进行中',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  },

  // 阻止事件冒泡
  stopPropagation: function (e) {
    e.stopPropagation();
  }
});