// 小蚁搬运小程序全局逻辑

App({
  globalData: {
    userInfo: null,
    token: '',
    tenantCode: '',
    currentLocation: null,
    baseUrl: '' // 初始化 baseUrl
  },

  onLaunch: function () {
    // 小程序启动时执行的初始化逻辑
    console.log('小蚁搬运小程序启动');

    // 设置默认 API 基础 URL
    this.setBaseUrl('http://localhost:4000'); // 根据修改后的后端地址设置

    // 尝试从本地存储恢复租户代码
    const storedTenantCode = wx.getStorageSync('tenantCode');
    if (storedTenantCode) {
      this.globalData.tenantCode = storedTenantCode;
    } else {
      // 设置默认租户代码
      this.globalData.tenantCode = 'TEST_TENANT';
      wx.setStorageSync('tenantCode', 'TEST_TENANT');
    }

    // 获取用户信息
    this.getUserInfo();

    // 检查登录状态
    this.checkLoginStatus();
  },

  onShow: function (options) {
    // 小程序显示时执行的逻辑
    console.log('小蚁搬运小程序显示', options);
  },

  onHide: function () {
    // 小程序隐藏时执行的逻辑
    console.log('小蚁搬运小程序隐藏');
  },

  // 获取用户信息
  getUserInfo: function () {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
  },

  // 获取当前位置
  getLocation: function () {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.globalData.currentLocation = {
          latitude: res.latitude,
          longitude: res.longitude
        };
      },
      fail: () => {
        console.log('获取位置失败');
        // 如果获取位置失败，可以引导用户授权
        this.requestLocationPermission();
      }
    });
  },

  // 请求位置权限
  requestLocationPermission: function () {
    wx.showModal({
      title: '需要位置权限',
      content: '小蚁搬运需要获取您的位置信息以提供更好的服务',
      showCancel: true,
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting({
            success: (settingRes) => {
              if (settingRes.authSetting['scope.userLocation']) {
                this.getLocation();
              }
            }
          });
        }
      }
    });
  },

  // 检查登录状态
  checkLoginStatus: function () {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      // 验证token是否有效
      this.validateToken(token);
    }
  },

  // 验证token
  validateToken: function (token) {
    // 发送请求验证token有效性
    wx.request({
      url: `${this.globalData.baseUrl}/api/auth/me`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-tenant-code': this.globalData.tenantCode
      },
      success: (res) => {
        if (res.data.success) {
          this.globalData.userInfo = res.data.data.user;
        } else {
          // token无效，清除本地存储
          this.clearAuthData();
        }
      },
      fail: (err) => {
        console.error('验证token失败', err);
        this.clearAuthData();
      }
    });
  },

  // 设置基础URL
  setBaseUrl: function (baseUrl) {
    this.globalData.baseUrl = baseUrl;
  },

  // 设置租户代码
  setTenantCode: function (tenantCode) {
    this.globalData.tenantCode = tenantCode;
    wx.setStorageSync('tenantCode', tenantCode);
  },

  // 地图相关API
  searchAddress: function (keyword, callback) {
    this.request({
      url: '/map/search-address',
      method: 'GET',
      data: { keyword: keyword },
      success: (res) => {
        typeof callback === 'function' && callback(true, res);
      },
      fail: (err) => {
        console.error('地址搜索失败', err);
        typeof callback === 'function' && callback(false, { success: false, message: '网络请求失败' });
      }
    });
  },

  // 地理编码 - 地址转坐标
  geocodeAddress: function (address, callback) {
    this.request({
      url: '/map/geocode',
      method: 'POST',
      data: { address: address },
      success: (res) => {
        typeof callback === 'function' && callback(true, res);
      },
      fail: (err) => {
        console.error('地理编码失败', err);
        typeof callback === 'function' && callback(false, { success: false, message: '网络请求失败' });
      }
    });
  },

  // 逆地理编码 - 坐标转地址
  reverseGeocode: function (lat, lng, callback) {
    this.request({
      url: '/map/reverse-geocode',
      method: 'POST',
      data: { lat: lat, lng: lng },
      success: (res) => {
        typeof callback === 'function' && callback(true, res);
      },
      fail: (err) => {
        console.error('逆地理编码失败', err);
        typeof callback === 'function' && callback(false, { success: false, message: '网络请求失败' });
      }
    });
  },

  // 计算距离
  calculateDistance: function (origin, destination, callback) {
    this.request({
      url: '/map/calculate-distance',
      method: 'POST',
      data: { origins: origin, destinations: destination },
      success: (res) => {
        typeof callback === 'function' && callback(true, res);
      },
      fail: (err) => {
        console.error('距离计算失败', err);
        typeof callback === 'function' && callback(false, { success: false, message: '网络请求失败' });
      }
    });
  },

  // 获取工人位置
  getWorkerLocation: function (workerId, callback) {
    this.request({
      url: `/workers/${workerId}/location`,
      method: 'GET',
      success: (res) => {
        typeof callback === 'function' && callback(true, res);
      },
      fail: (err) => {
        console.error('获取工人位置失败', err);
        typeof callback === 'function' && callback(false, { success: false, message: '网络请求失败' });
      }
    });
  },

  // 更新工人位置
  updateWorkerLocation: function (locationData, callback) {
    this.request({
      url: '/workers/location',
      method: 'PUT',
      data: locationData,
      success: (res) => {
        typeof callback === 'function' && callback(true, res);
      },
      fail: (err) => {
        console.error('更新工人位置失败', err);
        typeof callback === 'function' && callback(false, { success: false, message: '网络请求失败' });
      }
    });
  },

  // 地理编码 - 地址转坐标
  geocodeAddress: function (address, callback) {
    this.request({
      url: '/map/geocode',
      method: 'POST',
      data: { address: address },
      success: (res) => {
        typeof callback === 'function' && callback(res.success, res);
      },
      fail: (err) => {
        console.error('地理编码失败', err);
        typeof callback === 'function' && callback(false, { success: false, message: '网络请求失败' });
      }
    });
  },

  // 逆地理编码 - 坐标转地址
  reverseGeocode: function (lat, lng, callback) {
    this.request({
      url: '/map/reverse-geocode',
      method: 'POST',
      data: { lat: lat, lng: lng },
      success: (res) => {
        typeof callback === 'function' && callback(res.success, res);
      },
      fail: (err) => {
        console.error('逆地理编码失败', err);
        typeof callback === 'function' && callback(false, { success: false, message: '网络请求失败' });
      }
    });
  },

  // 获取工人位置
  getWorkerLocation: function (workerId, callback) {
    this.request({
      url: `/workers/${workerId}/location`,
      method: 'GET',
      success: (res) => {
        typeof callback === 'function' && callback(res.success, res);
      },
      fail: (err) => {
        console.error('获取工人位置失败', err);
        typeof callback === 'function' && callback(false, { success: false, message: '网络请求失败' });
      }
    });
  },

  // 更新工人位置
  updateWorkerLocation: function (locationData, callback) {
    this.request({
      url: '/workers/location',
      method: 'PUT',
      data: locationData,
      success: (res) => {
        typeof callback === 'function' && callback(res.success, res);
      },
      fail: (err) => {
        console.error('更新工人位置失败', err);
        typeof callback === 'function' && callback(false, { success: false, message: '网络请求失败' });
      }
    });
  },

  // 登录
  login: function (loginData, callback) {
    wx.request({
      url: `${this.globalData.baseUrl}/api/auth/login`,
      method: 'POST',
      data: loginData,
      header: {
        'Content-Type': 'application/json',
        'x-tenant-code': this.globalData.tenant_code || this.globalData.tenantCode
      },
      success: (res) => {
        if (res.data.success) {
          const { token, user } = res.data.data;
          
          // 存储token和用户信息
          this.globalData.token = token;
          this.globalData.userInfo = user;

          // 从登录请求中获取租户代码并存储
          if (loginData.tenantCode) {
            this.globalData.tenantCode = loginData.tenantCode;
            wx.setStorageSync('tenantCode', loginData.tenantCode);
          } else {
            // 如果登录时没有提供租户代码，尝试从本地存储获取
            const storedTenantCode = wx.getStorageSync('tenantCode');
            if (storedTenantCode) {
              this.globalData.tenantCode = storedTenantCode;
            } else {
              // 设置默认租户代码
              this.globalData.tenantCode = 'TEST_TENANT';
              wx.setStorageSync('tenantCode', 'TEST_TENANT');
            }
          }

          wx.setStorageSync('token', token);
          wx.setStorageSync('userInfo', user);

          typeof callback === 'function' && callback(true, res.data);
        } else {
          typeof callback === 'function' && callback(false, res.data);
        }
      },
      fail: (err) => {
        console.error('登录失败', err);
        typeof callback === 'function' && callback(false, { success: false, message: '网络请求失败' });
      }
    });
  },

  // 登出
  logout: function () {
    this.clearAuthData();
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 清除认证数据
  clearAuthData: function () {
    this.globalData.token = '';
    this.globalData.userInfo = null;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
  },

  // 封装请求方法
  request: function (options) {
    const { url, method = 'GET', data = {}, success, fail } = options;

    // 添加调试日志
    const requestHeaders = {
      'Authorization': `Bearer ${this.globalData.token}`,
      'Content-Type': 'application/json',
      'x-tenant-code': this.globalData.tenant_code || this.globalData.tenantCode
    };
    console.log('App.request called with:', {
      url: `${this.globalData.baseUrl}/api${url}`,
      method: method,
      headers: requestHeaders,
      data: data
    });
    console.log('App.request headers sent:', requestHeaders); // 新增：单独打印 headers

    wx.request({
      url: `${this.globalData.baseUrl}/api${url}`,
      method: method,
      data: data,
      header: {
        'Authorization': `Bearer ${this.globalData.token}`,
        'Content-Type': 'application/json',
        'x-tenant-code': this.globalData.tenant_code || this.globalData.tenantCode
      },
      success: (res) => {
        console.log('App.request success:', res); // 添加成功日志
        if (res.statusCode === 200) {
          if (res.data.success) {
            typeof success === 'function' && success(res.data);
          } else {
            // 处理业务错误
            wx.showToast({
              title: res.data.message || '请求失败',
              icon: 'none'
            });
            typeof success === 'function' && success(res.data);
          }
        } else if (res.statusCode === 401) {
          // token过期或无效，跳转到登录页
          this.clearAuthData();
          wx.redirectTo({
            url: '/pages/login/login'
          });
        } else {
          // 其他错误
          wx.showToast({
            title: '服务器错误',
            icon: 'none'
          });
          typeof fail === 'function' && fail(res);
        }
      },
      fail: (err) => {
        console.error('App.request failed:', err); // 添加失败日志
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
        typeof fail === 'function' && fail(err);
      }
    });
  },

  // 全局错误处理
  onError: function (error) {
    console.error('全局错误捕获:', error);
    // 可以在这里上报错误日志到服务器
    // 示例：如果错误信息包含特定关键词，可以做特殊处理或上报
    if (error.includes('__subPageFrameEndTime__')) {
      console.warn('捕获到 __subPageFrameEndTime__ 相关错误，这可能是微信小程序框架内部的性能监控问题。');
      // 这里可以调用一个上报函数，将错误信息发送到你的日志服务
      // this.reportError(error);
    }
  }
});