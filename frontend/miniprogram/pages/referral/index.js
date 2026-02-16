// pages/referral/index.js
const app = getApp();

Page({
  data: {
    campaigns: [],
    referralStats: null,
    totalRewards: 0
  },

  onLoad: function () {
    this.fetchData();
  },

  onShow: function () {
    this.fetchData();
  },

  // 获取数据
  fetchData: function () {
    this.fetchCampaigns();
    this.fetchReferralStats();
    this.fetchTotalRewards();
  },

  // 获取推荐活动列表
  fetchCampaigns: function () {
    app.request({
      url: '/referral/campaigns',
      method: 'GET',
      success: (res) => {
        if (res.success) {
          this.setData({
            campaigns: res.data.campaigns || []
          });
        } else {
          wx.showToast({
            title: res.message || '获取推荐活动失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取推荐活动失败', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },

  // 获取推荐统计
  fetchReferralStats: function () {
    app.request({
      url: '/referral/stats',
      method: 'GET',
      success: (res) => {
        if (res.success) {
          this.setData({
            referralStats: res.data.stats
          });
        }
      },
      fail: (err) => {
        console.error('获取推荐统计失败', err);
      }
    });
  },

  // 获取总奖励金额
  fetchTotalRewards: function () {
    app.request({
      url: '/referral/total-rewards',
      method: 'GET',
      success: (res) => {
        if (res.success) {
          this.setData({
            totalRewards: res.data.totalRewards
          });
        }
      },
      fail: (err) => {
        console.error('获取总奖励金额失败', err);
      }
    });
  },

  // 查看活动详情
  viewCampaignDetail: function (e) {
    const campaignId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/referral/detail?id=${campaignId}`
    });
  },

  // 分享活动
  shareCampaign: function (e) {
    const campaignId = e.currentTarget.dataset.id;
    const campaign = e.currentTarget.dataset.campaign;

    // 调用后端API生成分享链接
    app.request({
      url: '/referral/generate-link',
      method: 'POST',
      data: {
        campaignId: campaignId
      },
      success: (res) => {
        if (res.success) {
          const shareInfo = res.data.data.shareInfo;

          // 显示分享弹窗
          wx.showActionSheet({
            itemList: ['分享给朋友', '分享到朋友圈', '复制链接'],
            success: (res) => {
              if (res.tapIndex === 0) {
                // 分享给朋友
                wx.navigateTo({
                  url: `/pages/referral/share?campaignId=${campaignId}&referralCode=${res.data.data.referralCode}`
                });
              } else if (res.tapIndex === 1) {
                // 分享到朋友圈 - 需要使用转发功能
                this.onShareAppMessage({
                  from: 'menu',
                  target: null
                });
              } else if (res.tapIndex === 2) {
                // 复制链接
                wx.setClipboardData({
                  data: res.data.data.referralLink,
                  success: () => {
                    wx.showToast({
                      title: '链接已复制',
                      icon: 'success'
                    });
                  }
                });
              }
            }
          });
        } else {
          wx.showToast({
            title: res.message || '生成分享链接失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('生成分享链接失败', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },

  // 页面分享
  onShareAppMessage: function (options) {
    // 获取当前用户的推荐码
    return {
      title: '快来加入小蚁搬运，一起赚钱吧！',
      path: '/pages/auth/register?ref=' + this.data.currentUserReferralCode,
      imageUrl: '/images/referral-share.jpg'
    };
  },

  // 页面分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '快来加入小蚁搬运，一起赚钱吧！',
      query: 'ref=' + this.data.currentUserReferralCode,
      imageUrl: '/images/referral-share.jpg'
    };
  },

  // 状态文本转换
  getStatusText: function (status) {
    const statusMap = {
      'active': '进行中',
      'draft': '草稿',
      'paused': '暂停',
      'ended': '已结束'
    };
    return statusMap[status] || status;
  },

  // 日期格式化
  formatDate: function (dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
});