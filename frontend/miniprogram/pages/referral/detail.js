// pages/referral/detail.js
const app = getApp();

Page({
  data: {
    campaign: {},
    campaignId: null,
    isPageDestroyed: false
  },

  onLoad: function (options) {
    const campaignId = options.id;
    this.setData({
      campaignId: campaignId
    });

    this.fetchCampaignDetail();
  },

  onUnload: function () {
    this.setData({
      isPageDestroyed: true
    });
  },

  // 获取活动详情
  fetchCampaignDetail: function () {
    app.request({
      url: `/referral/campaigns/${this.data.campaignId}`,
      method: 'GET',
      success: (res) => {
        if (res.success) {
          this.setData({
            campaign: res.data.campaign
          });
        } else {
          wx.showToast({
            title: res.message || '获取活动详情失败',
            icon: 'none'
          });
          
          // 返回上一页
          setTimeout(() => {
            if (this.data.isPageDestroyed) return;
            wx.navigateBack();
          }, 1500);
        }
      },
      fail: (err) => {
        console.error('获取活动详情失败', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },

  // 分享活动
  shareCampaign: function () {
    // 调用后端API生成分享链接
    app.request({
      url: '/referral/generate-link',
      method: 'POST',
      data: {
        campaignId: this.data.campaignId
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
                this.onShareAppMessage({
                  from: 'button',
                  target: null
                });
              } else if (res.tapIndex === 1) {
                // 分享到朋友圈
                this.onShareTimeline();
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
    return {
      title: this.data.campaign.share_title || '快来加入小蚁搬运，一起赚钱吧！',
      desc: this.data.campaign.share_desc || '专业搬运服务，安全可靠，收益丰厚',
      path: `/pages/auth/register?ref=${this.data.currentUserReferralCode}&campaign=${this.data.campaignId}`,
      imageUrl: this.data.campaign.share_image || '/images/referral-share.jpg'
    };
  },

  // 页面分享到朋友圈
  onShareTimeline: function () {
    return {
      title: this.data.campaign.share_title || '快来加入小蚁搬运，一起赚钱吧！',
      query: `ref=${this.data.currentUserReferralCode}&campaign=${this.data.campaignId}`,
      imageUrl: this.data.campaign.share_image || '/images/referral-share.jpg'
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