// pages/map/address-selector.js
const app = getApp();

Page({
  data: {
    searchKeyword: '',
    searchResults: [],
    showSearchResults: false,
    selectedAddress: null,
    userLocation: null,
    largeFontSize: true  // 为老年人设置大字体
  },

  onLoad: function (options) {
    // 获取用户位置权限
    this.getLocationPermission();
  },

  // 获取位置权限
  getLocationPermission: function () {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          userLocation: {
            latitude: res.latitude,
            longitude: res.longitude
          }
        });
      },
      fail: (err) => {
        console.log('获取位置失败，用户可能拒绝了位置权限', err);
        // 如果获取位置失败，也可以继续使用
      }
    });
  },

  // 搜索地址输入
  onSearchInput: function (e) {
    const keyword = e.detail.value.trim();
    this.setData({
      searchKeyword: keyword
    });

    if (keyword.length > 0) {
      this.performSearch(keyword);
    } else {
      this.setData({
        searchResults: [],
        showSearchResults: false
      });
    }
  },

  // 执行地址搜索
  performSearch: function (keyword) {
    // 使用app.js中定义的searchAddress方法
    app.searchAddress(keyword, (success, res) => {
      if (success && res.success) {
        this.setData({
          searchResults: res.data.addresses || [],
          showSearchResults: true
        });
      } else {
        this.setData({
          searchResults: [],
          showSearchResults: false
        });
        wx.showToast({
          title: res.message || '搜索失败',
          icon: 'none'
        });
      }
    });
  },

  // 选择地址
  selectAddress: function (e) {
    const index = e.currentTarget.dataset.index;
    const selected = this.data.searchResults[index];

    this.setData({
      selectedAddress: selected,
      showSearchResults: false
    });

    // 返回选择的地址给上级页面
    const eventChannel = this.getOpenerEventChannel();
    if (eventChannel) {
      eventChannel.emit('selectedAddress', selected);
      wx.navigateBack();
    }
  },

  // 清空搜索
  clearSearch: function () {
    this.setData({
      searchKeyword: '',
      searchResults: [],
      showSearchResults: false
    });
  },

  // 使用当前位置
  useCurrentLocation: function () {
    if (!this.data.userLocation) {
      wx.showToast({
        title: '无法获取当前位置',
        icon: 'none'
      });
      return;
    }

    // 通过逆地理编码获取当前位置的地址
    app.reverseGeocode(
      this.data.userLocation.latitude,
      this.data.userLocation.longitude,
      (success, res) => {
        if (success && res.success) {
          const addressInfo = res.data.addressInfo;
          const selected = {
            id: 'current-location',
            name: '当前位置',
            address: addressInfo.address,
            location: {
              lng: this.data.userLocation.longitude,
              lat: this.data.userLocation.latitude
            }
          };

          this.setData({
            selectedAddress: selected
          });

          // 返回选择的地址给上级页面
          const eventChannel = this.getOpenerEventChannel();
          if (eventChannel) {
            eventChannel.emit('selectedAddress', selected);
            wx.navigateBack();
          }
        } else {
          wx.showToast({
            title: res.message || '获取地址信息失败',
            icon: 'none'
          });
        }
      }
    );
  },

  // 阻止事件冒泡
  stopPropagation: function (e) {
    e.stopPropagation();
  }
});