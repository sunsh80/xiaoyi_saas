// pages/referral/share.js
const app = getApp();

Page({
  data: {
    campaign: {},
    referralCode: '',
    campaignId: ''
  },

  onLoad: function (options) {
    const campaignId = options.campaignId;
    const referralCode = options.referralCode;
    
    this.setData({
      campaignId: campaignId,
      referralCode: referralCode
    });
    
    this.fetchCampaignDetail();
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

  // 分享给朋友
  shareToFriends: function () {
    this.onShareAppMessage({
      from: 'button',
      target: null
    });
  },

  // 分享到朋友圈
  shareToTimeline: function () {
    this.onShareTimeline();
  },

  // 复制链接
  copyLink: function () {
    const link = `${app.globalData.baseUrl}/pages/auth/register?ref=${this.data.referralCode}&campaign=${this.data.campaignId}`;
    
    wx.setClipboardData({
      data: link,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        });
      }
    });
  },

  // 关闭页面
  closePage: function () {
    wx.navigateBack();
  },

  // 页面分享
  onShareAppMessage: function (options) {
    return {
      title: this.data.campaign.share_title || '快来加入小蚁搬运，一起赚钱吧！',
      desc: this.data.campaign.share_desc || '专业搬运服务，安全可靠，收益丰厚',
      path: `/pages/auth/register?ref=${this.data.referralCode}&campaign=${this.data.campaignId}`,
      imageUrl: this.data.campaign.share_image || '/images/referral-share.jpg'
    };
  },

  // 页面分享到朋友圈
  onShareTimeline: function () {
    return {
      title: this.data.campaign.share_title || '快来加入小蚁搬运，一起赚钱吧！',
      query: `ref=${this.data.referralCode}&campaign=${this.data.campaignId}`,
      imageUrl: this.data.campaign.share_image || '/images/referral-share.jpg'
    };
  }
});