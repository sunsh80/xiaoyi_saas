// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    userInfo: {},
    isLogin: false,
    workerStats: {
      totalOrders: 0,
      rating: '5.0',
      workStatus: 1,
      workStatusText: '工作中'
    },
    workStatusText: '工作中',
    workStatusIcon: 'working-icon.png' // 默认图标
  },

  onLoad: function () {
    this.checkLoginStatus();
  },

  onShow: function () {
    this.checkLoginStatus();
    this.updateWorkStatusDisplay();
  },

  // 检查登录状态
  checkLoginStatus: function () {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (token && userInfo) {
      this.setData({
        userInfo: userInfo,
        isLogin: true
      });

      // 如果是接单人员，获取工作统计信息
      if (userInfo.role === 'worker') {
        this.fetchWorkerStats();
      }
    } else {
      this.setData({
        userInfo: {},
        isLogin: false
      });
    }
  },

  // 获取接单人员统计信息
  fetchWorkerStats: function () {
    // 这里可以调用获取接单人员统计的API
    // 暂时使用模拟数据
    const mockStats = {
      totalOrders: 24,
      rating: '4.8',
      workStatus: 1,
      workStatusText: '工作中'
    };

    this.setData({
      workerStats: mockStats
    });
  },

  // 角色文本转换
  getUserRoleText: function (role) {
    const roleMap = {
      'tenant_admin': '租户管理员',
      'tenant_user': '租户用户',
      'worker': '接单人员',
      'admin': '系统管理员'
    };
    return roleMap[role] || '未知角色';
  },

  // 跳转到指定页面
  goToPage: function (e) {
    const page = e.currentTarget.dataset.page;

    // 如果未登录且不是去登录页面，则跳转到登录
    if (!this.data.isLogin && !page.includes('login')) {
      wx.navigateTo({
        url: '/pages/login/login'
      });
      return;
    }

    // 特殊处理订单创建页面，检查用户权限
    if (page === 'pages/orders/create') {
      const userRole = this.data.userInfo?.role;
      if (userRole !== 'tenant_admin' && userRole !== 'tenant_user') {
        wx.showModal({
          title: '权限不足',
          content: '只有租户管理员或租户用户可以发布订单',
          showCancel: false
        });
        return;
      }
    }

    wx.navigateTo({
      url: `/${page}`
    });
  },

  // 联系我们
  contactUs: function () {
    wx.showModal({
      title: '联系客服',
      content: '客服电话: 400-123-4567\n服务时间: 9:00-18:00',
      confirmText: '拨打电话',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '400-123-4567' // 替换为实际客服电话
          });
        }
      }
    });
  },

  // 跳转到接单范围设置
  goToJobRangeSettings: function () {
    if (!this.data.isLogin) {
      wx.navigateTo({
        url: '/pages/login/login'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/settings/range'
    });
  },

  // 跳转到登录页面
  goToLoginPage: function () {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // 退出登录
  logout: function () {
    wx.showModal({
      title: '确认退出',
      content: '您确定要退出登录吗？',
      confirmText: '确认退出',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          app.logout();
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            duration: 2000
          });

          // 延迟跳转到登录页
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/login/login'
            });
          }, 1500);
        }
      }
    });
  },

  // 切换工作状态
  switchWorkStatus: function () {
    if (!this.data.isLogin) {
      wx.navigateTo({
        url: '/pages/login/login'
      });
      return;
    }

    if (this.data.userInfo.role !== 'worker') {
      wx.showToast({
        title: '只有接单人员可以切换工作状态',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const newStatus = this.data.workerStats.workStatus === 1 ? 0 : 1;
    const newStatusText = newStatus === 1 ? '工作中' : '休息中';

    // 这里可以调用更新工作状态的API
    // 暂时更新本地状态
    this.setData({
      'workerStats.workStatus': newStatus,
      'workerStats.workStatusText': newStatusText
    });

    wx.showToast({
      title: `已${newStatusText}`,
      icon: 'success',
      duration: 2000
    });

    this.updateWorkStatusDisplay();
  },

  // 切换工作状态
  switchWorkStatus: function () {
    if (!this.data.isLogin) {
      wx.navigateTo({
        url: '/pages/login/login'
      });
      return;
    }

    if (this.data.userInfo.role !== 'worker') {
      wx.showToast({
        title: '只有接单人员可以切换工作状态',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const newStatus = this.data.workerStats.workStatus === 1 ? 0 : 1;
    const newStatusText = newStatus === 1 ? '工作中' : '休息中';
    const newIcon = newStatus === 1 ? 'working-icon.png' : 'rest-icon.png';

    // 这里可以调用更新工作状态的API
    // 暂时更新本地状态
    this.setData({
      'workerStats.workStatus': newStatus,
      'workerStats.workStatusText': newStatusText,
      workStatusText: newStatus === 1 ? '切换休息' : '开始工作',
      workStatusIcon: newIcon
    });

    wx.showToast({
      title: `已${newStatusText}`,
      icon: 'success',
      duration: 1500
    });
  },

  // 更新工作状态显示
  updateWorkStatusDisplay: function () {
    const workStatus = this.data.workerStats.workStatus;
    if (workStatus === 1) {
      this.setData({
        workStatusText: '切换休息',
        workStatusIcon: 'working-icon.png'
      });
    } else {
      this.setData({
        workStatusText: '开始工作',
        workStatusIcon: 'rest-icon.png'
      });
    }
  }
});