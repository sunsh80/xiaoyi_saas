// pages/auth/register-type/register-type.js
Page({
  data: {},

  onLoad: function () {
    // 页面加载时的逻辑
  },

  // 选择注册类型
  selectType: function (e) {
    const type = e.currentTarget.dataset.type;
    
    if (type === 'tenant') {
      // 跳转到租户注册页面
      wx.navigateTo({
        url: '/pages/auth/tenant-register/tenant-register'
      });
    } else if (type === 'worker') {
      // 跳转到工人入驻页面
      wx.navigateTo({
        url: '/pages/auth/worker-register/worker-register'
      });
    }
  }
});
