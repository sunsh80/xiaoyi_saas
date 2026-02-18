// pages/auth/tenant-register/tenant-register.js
const app = getApp();

Page({
  data: {
    tenant_name: '',
    address: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    admin_username: '',
    admin_password: '',
    confirm_password: ''
  },

  onLoad: function () {
    // 页面加载
  },

  // 输入处理
  onInput: function (e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    
    const data = {};
    data[field] = value;
    this.setData(data);
  },

  // 验证表单
  validateForm: function () {
    const { 
      tenant_name, 
      contact_person, 
      contact_phone,
      admin_username,
      admin_password,
      confirm_password
    } = this.data;

    if (!tenant_name) {
      wx.showToast({ title: '请输入企业名称', icon: 'none' });
      return false;
    }

    if (!contact_person) {
      wx.showToast({ title: '请输入联系人姓名', icon: 'none' });
      return false;
    }

    if (!contact_phone || contact_phone.length !== 11) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return false;
    }

    if (!admin_username) {
      wx.showToast({ title: '请设置用户名', icon: 'none' });
      return false;
    }

    if (!admin_password || admin_password.length < 6) {
      wx.showToast({ title: '密码至少 6 位', icon: 'none' });
      return false;
    }

    if (admin_password !== confirm_password) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' });
      return false;
    }

    return true;
  },

  // 提交注册
  submitRegister: function () {
    if (!this.validateForm()) {
      return;
    }

    wx.showLoading({ title: '提交中...' });

    const { 
      tenant_name, 
      address, 
      contact_person, 
      contact_phone, 
      contact_email,
      admin_username,
      admin_password
    } = this.data;

    // 调用租户注册 API
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/auth/tenant-register`,
      method: 'POST',
      data: {
        tenant_name,
        address,
        contact_person,
        contact_phone,
        contact_email: contact_email || null,
        admin_username,
        admin_password
      },
      success: (res) => {
        wx.hideLoading();
        
        if (res.data.success) {
          wx.showModal({
            title: '注册成功',
            content: '您的注册申请已提交，请等待总后台审批。审批通过后会通知您。',
            showCancel: false,
            success: () => {
              // 返回登录页
              wx.navigateBack({ delta: 2 });
            }
          });
        } else {
          wx.showToast({
            title: res.data.message || '注册失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('注册失败:', err);
        
        // 演示模式：模拟成功
        wx.showModal({
          title: '注册成功（演示）',
          content: '演示模式下，租户注册申请已提交。实际项目中需连接后端 API。',
          showCancel: false,
          success: () => {
            wx.navigateBack({ delta: 2 });
          }
        });
      }
    });
  }
});
