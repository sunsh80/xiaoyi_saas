// pages/orders/create.js
const app = getApp();

Page({
  data: {
    orderData: {
      title: '',
      description: '',
      customer_name: '',
      phone: '',
      address: '',
      pickup_address: '',
      delivery_address: '',
      pickup_time: '',
      delivery_time: '',
      distance: '',
      weight: '',
      volume: '',
      amount: ''
    }
  },

  onLoad: function (options) {
    // 检查用户权限
    const userInfo = app.globalData.userInfo;
    if (!userInfo || (userInfo.role !== 'tenant_admin' && userInfo.role !== 'tenant_user')) {
      wx.showModal({
        title: '权限不足',
        content: '只有租户管理员或租户用户可以发布订单',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }
  },

  // 输入框变化处理
  onInputChange: function (e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;

    this.setData({
      [`orderData.${field}`]: value
    });
  },

  // 表单提交处理
  submitOrder: function (e) {
    const formData = e.detail.value;

    // 验证必填字段
    if (!formData.title) {
      wx.showToast({
        title: '请输入订单标题',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    if (!formData.customer_name || !formData.phone || !formData.address) {
      wx.showToast({
        title: '请填写客户信息',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    if (!formData.pickup_address || !formData.delivery_address) {
      wx.showToast({
        title: '请填写取货和送货地址',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    if (!formData.amount) {
      wx.showToast({
        title: '请输入订单金额',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 显示确认对话框
    wx.showModal({
      title: '确认发布',
      content: `订单标题: ${formData.title}\n取货地址: ${formData.pickup_address}\n送货地址: ${formData.delivery_address}\n金额: ¥${formData.amount}\n\n您确定要发布此订单吗？`,
      confirmText: '确认发布',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.createOrder(formData);
        }
      }
    });
  },

  // 提交订单
  submitOrder: function (e) {
    const formData = e.detail.value;
    
    // 验证必填字段
    if (!formData.title) {
      wx.showToast({
        title: '请输入订单标题',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    if (!formData.customer_name || !formData.phone || !formData.address) {
      wx.showToast({
        title: '请填写客户信息',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    if (!formData.pickup_address || !formData.delivery_address) {
      wx.showToast({
        title: '请填写取货和送货地址',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    if (!formData.amount) {
      wx.showToast({
        title: '请输入订单金额',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 显示确认对话框
    wx.showModal({
      title: '确认发布',
      content: `订单标题: ${formData.title}\n取货地址: ${formData.pickup_address}\n送货地址: ${formData.delivery_address}\n金额: ¥${formData.amount}\n\n您确定要发布此订单吗？`,
      confirmText: '确认发布',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.createOrder(formData);
        }
      }
    });
  },

  // 创建订单
  createOrder: function (orderData) {
    wx.showLoading({
      title: '发布中...',
    });

    app.request({
      url: '/orders',
      method: 'POST',
      data: orderData,
      success: (res) => {
        wx.hideLoading();

        if (res.success) {
          wx.showToast({
            title: '订单发布成功',
            icon: 'success',
            duration: 2000
          });

          // 延迟返回订单列表
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: res.message || '订单发布失败',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('订单发布失败', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  // 选择地址（使用地图选择）
  selectPickupAddress: function () {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          'orderData.pickup_address': res.address || res.name
        });
      },
      fail: (err) => {
        console.log('选择位置失败', err);
        // 如果用户拒绝位置权限，可以引导用户手动输入
        wx.showModal({
          title: '提示',
          content: '需要位置权限才能选择地址，您可以手动输入地址',
          showCancel: false
        });
      }
    });
  },

  selectDeliveryAddress: function () {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          'orderData.delivery_address': res.address || res.name
        });
      },
      fail: (err) => {
        console.log('选择位置失败', err);
        wx.showModal({
          title: '提示',
          content: '需要位置权限才能选择地址，您可以手动输入地址',
          showCancel: false
        });
      }
    });
  }
});