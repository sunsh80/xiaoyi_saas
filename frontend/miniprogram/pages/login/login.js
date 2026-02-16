// pages/login/login.js
const app = getApp();

Page({
  data: {
    username: '',
    password: '',
    tenantList: [
      { id: 1, code: 'tenant1', name: '租户一' },
      { id: 2, code: 'tenant2', name: '租户二' },
      { id: 3, code: 'tenant3', name: '租户三' },
      { id: 4, code: 'TEST_TENANT', name: '测试租户' },
      { id: 5, code: 'DEV_TENANT', name: '开发租户' }
    ],
    tenantIndex: 3,  // 默认选中测试租户
    showTenantPicker: false
  },

  onLoad: function () {
    // 尝试从本地存储恢复用户名
    const savedUsername = wx.getStorageSync('lastUsername');
    if (savedUsername) {
      this.setData({ username: savedUsername });
    }
  },

  // 用户名输入
  onUsernameInput: function (e) {
    this.setData({
      username: e.detail.value
    });
  },

  // 密码输入
  onPasswordInput: function (e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 显示租户选择器
  showTenantSelector: function () {
    this.setData({
      showTenantPicker: true
    });
  },

  // 隐藏租户选择器
  hideTenantSelector: function () {
    this.setData({
      showTenantPicker: false
    });
  },

  // 选择租户
  selectTenant: function (e) {
    const index = e.currentTarget.dataset.index;
    const selectedTenant = this.data.tenantList[index];

    this.setData({
      tenantIndex: index,
      showTenantPicker: false
    });

    // 设置选中的租户代码到app
    app.setTenantCode(selectedTenant.code);
  },

  // 登录
  login: function () {
    const { username, password } = this.data;

    if (!username) {
      wx.showToast({
        title: '请输入用户名或手机号',
        icon: 'none'
      });
      return;
    }

    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return;
    }

    // 显示加载提示
    wx.showLoading({
      title: '登录中...'
    });

    // 执行登录
    app.login({
      username,
      password
    }, (success, res) => {
      wx.hideLoading();

      if (success) {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        // 保存用户名到本地存储
        wx.setStorageSync('lastUsername', username);

        // 延迟跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1000);
      } else {
        wx.showToast({
          title: res.message || '登录失败',
          icon: 'none'
        });
      }
    });
  },

  // 跳转到注册页面
  goToRegister: function () {
    wx.navigateTo({
      url: '/pages/auth/register'
    });
  }
});