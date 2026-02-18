// pages/auth/worker-register/worker-register.js
const app = getApp();

Page({
  data: {
    real_name: '',
    phone: '',
    id_card: '',
    username: '',
    password: '',
    confirm_password: '',
    skills: [],
    agreed: false
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

  // 切换技能标签
  toggleSkill: function (e) {
    const skill = e.currentTarget.dataset.skill;
    const skills = this.data.skills;
    
    const index = skills.indexOf(skill);
    if (index > -1) {
      skills.splice(index, 1);
    } else {
      skills.push(skill);
    }
    
    this.setData({ skills });
  },

  // 服务协议选择
  onAgreementChange: function (e) {
    const values = e.detail.value;
    this.setData({
      agreed: values.includes('agree')
    });
  },

  // 验证表单
  validateForm: function () {
    const { 
      real_name, 
      phone, 
      username,
      password,
      confirm_password,
      agreed
    } = this.data;

    if (!real_name) {
      wx.showToast({ title: '请输入真实姓名', icon: 'none' });
      return false;
    }

    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return false;
    }

    if (!username) {
      wx.showToast({ title: '请设置用户名', icon: 'none' });
      return false;
    }

    if (!password || password.length < 6) {
      wx.showToast({ title: '密码至少 6 位', icon: 'none' });
      return false;
    }

    if (password !== confirm_password) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' });
      return false;
    }

    if (!agreed) {
      wx.showToast({ title: '请同意入驻协议', icon: 'none' });
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
      real_name, 
      phone, 
      id_card,
      username,
      password,
      skills
    } = this.data;

    // 调用工人入驻 API（公共工人池，无需租户编码）
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/auth/worker-register`,
      method: 'POST',
      data: {
        real_name,
        phone,
        id_card: id_card || null,
        username,
        password,
        skills: skills.join(',')
      },
      success: (res) => {
        wx.hideLoading();
        
        if (res.data.success) {
          wx.showModal({
            title: '入驻成功',
            content: '欢迎加入小蚁搬运！您现在可以开始接单了。',
            showCancel: false,
            success: () => {
              // 跳转到登录页
              wx.navigateBack({ delta: 2 });
            }
          });
        } else {
          wx.showToast({
            title: res.data.message || '入驻失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('入驻失败:', err);
        
        // 演示模式：模拟成功
        wx.showModal({
          title: '入驻成功（演示）',
          content: '演示模式下，工人入驻申请已提交。实际项目中需连接后端 API。',
          showCancel: false,
          success: () => {
            wx.navigateBack({ delta: 2 });
          }
        });
      }
    });
  }
});
