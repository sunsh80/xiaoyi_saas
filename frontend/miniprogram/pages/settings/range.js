// pages/settings/range.js
const app = getApp();

Page({
  data: {
    currentLocation: null,
    locationName: '未设置',
    radius: 5, // 默认半径 5 公里
    radiusOptions: [
      { value: 1, label: '1公里' },
      { value: 3, label: '3公里' },
      { value: 5, label: '5公里' },
      { value: 10, label: '10公里' },
      { value: 20, label: '20公里' },
      { value: 50, label: '50公里' }
    ]
  },

  onLoad: function () {
    // 尝试从全局数据或本地存储恢复位置和范围设置
    const savedLocation = app.globalData.currentLocation;
    if (savedLocation) {
      this.setData({
        currentLocation: savedLocation,
        locationName: `${savedLocation.latitude.toFixed(6)}, ${savedLocation.longitude.toFixed(6)}`
      });
    }

    const savedRadius = wx.getStorageSync('jobRangeRadius');
    if (savedRadius) {
      this.setData({
        radius: savedRadius
      });
    }
  },

  // 选择接单位置
  selectLocation: function () {
    wx.chooseLocation({
      success: (res) => {
        const location = {
          latitude: res.latitude,
          longitude: res.longitude
        };

        this.setData({
          currentLocation: location,
          locationName: res.name || `${res.latitude.toFixed(6)}, ${res.longitude.toFixed(6)}`
        });

        // 更新全局数据
        app.globalData.currentLocation = location;

        // 保存到本地存储
        wx.setStorageSync('jobRangeLocation', location);
      },
      fail: (err) => {
        console.error('选择位置失败', err);
        wx.showToast({
          title: '选择位置失败',
          icon: 'none'
        });
      }
    });
  },

  // 通过地图选择位置
  selectLocationOnMap: function () {
    // 如果 chooseLocation 不够用，可以跳转到自定义地图页面
    // 这里先用 chooseLocation 演示
    this.selectLocation();
  },

  // 选择范围半径
  selectRadius: function (e) {
    const radius = parseInt(e.currentTarget.dataset.radius);
    this.setData({
      radius: radius
    });

    // 保存到本地存储
    wx.setStorageSync('jobRangeRadius', radius);
  },

  // 保存设置
  saveSettings: function () {
    if (!this.data.currentLocation) {
      wx.showToast({
        title: '请先选择接单位置',
        icon: 'none'
      });
      return;
    }

    wx.showToast({
      title: '设置已保存',
      icon: 'success'
    });

    // 可以在这里调用后端API，将用户的接单范围设置同步到服务器
    // app.request({...})
  },

  // 使用当前位置
  useCurrentLocation: function () {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const location = {
          latitude: res.latitude,
          longitude: res.longitude
        };

        this.setData({
          currentLocation: location,
          locationName: `${res.latitude.toFixed(6)}, ${res.longitude.toFixed(6)}`
        });

        // 更新全局数据
        app.globalData.currentLocation = location;

        // 保存到本地存储
        wx.setStorageSync('jobRangeLocation', location);

        wx.showToast({
          title: '已使用当前位置',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('获取当前位置失败', err);
        wx.showToast({
          title: '获取当前位置失败',
          icon: 'none'
        });
        // 引导用户开启定位权限
        this.requestLocationPermission();
      }
    });
  },

  // 请求位置权限
  requestLocationPermission: function () {
    wx.showModal({
      title: '需要位置权限',
      content: '小蚁搬运需要获取您的位置信息以设置接单范围',
      showCancel: true,
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting({
            success: (settingRes) => {
              if (settingRes.authSetting['scope.userLocation']) {
                this.useCurrentLocation();
              }
            }
          });
        }
      }
    });
  }
});