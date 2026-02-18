// pages/login/login.js
const app = getApp();

Page({
  data: {
    phone: '',
    password: '',
    selectedTenant: null,
    tenantList: [
      { id: 1, code: 'tenant1', name: '租户一' },
      { id: 2, code: 'tenant2', name: '租户二' },
      { id: 3, code: 'tenant3', name: '租户三' }
    ]
  },

  onLoad: function () {
    // 尝试从本地存储恢复手机号
    const savedPhone = wx.getStorageSync('lastPhone');
    if (savedPhone) {
      this.setData({ phone: savedPhone });
    }
  },

  // 手机号输入
  onPhoneInput: function (e) {
    this.setData({
      phone: e.detail.value
    });
  },

  // 密码输入
  onPasswordInput: function (e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 选择租户
  selectTenant: function (e) {
    const tenantCode = e.currentTarget.dataset.tenant;
    const tenant = this.data.tenantList.find(t => t.code === tenantCode);
    
    this.setData({
      selectedTenant: tenant
    });

    // 设置选中的租户代码到 app
    app.setTenantCode(tenantCode);
  },

  // 登录
  login: function () {
    const { phone, password, selectedTenant } = this.data;

    if (!phone) {
      wx.showToast({
        title: '请输入手机号',
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

    if (!selectedTenant) {
      wx.showToast({
        title: '请选择租户角色',
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
      username: phone,
      password: password
    }, (success, res) => {
      wx.hideLoading();

      if (success) {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        // 保存手机号到本地存储
        wx.setStorageSync('lastPhone', phone);

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
    // 跳转到注册类型选择页面
    wx.navigateTo({
      url: '/pages/auth/register-type/register-type'
    });
  }
});