// pages/orders/list.js
const app = getApp();

Page({
  data: {
    currentFilter: 'pending',
    currentFilterText: '待接单',
    orders: [],
    page: 1,
    limit: 10,
    hasMore: true,
    isLoading: false,
    userRole: '',
    isPageDestroyed: false
  },

  onLoad: function (options) {
    // 获取用户角色
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({
        userRole: userInfo.role
      });
    }

    // 默认显示待接单状态的订单，便于工人快速接单
    this.setData({
      currentFilter: 'pending',
      currentFilterText: '待接单'
    });

    // 获取订单列表
    this.fetchOrders();
  },

  onShow: function () {
    // 页面显示时刷新数据
    this.fetchOrders();
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.setData({
      page: 1,
      orders: [],
      hasMore: true
    });
    this.fetchOrders(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载
  onReachBottom: function () {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadMoreOrders();
    }
  },

  onUnload: function () {
    this.setData({
      isPageDestroyed: true
    });
  },

  // 获取订单列表
  fetchOrders: function (callback) {
    if (this.data.isLoading) return;

    this.setData({ isLoading: true });

    const params = {
      status: this.data.currentFilter === 'all' ? undefined : this.data.currentFilter,
      page: this.data.page,
      limit: this.data.limit
    };

    app.request({
      url: '/orders',
      method: 'GET',
      data: params,
      success: (res) => {
        if (res.success) {
          const orders = res.data.orders || [];
          const pagination = res.data.pagination || {};

          this.setData({
            orders: this.data.page === 1 ? orders : [...this.data.orders, ...orders],
            hasMore: pagination.current < pagination.pages
          });
        } else {
          wx.showToast({
            title: res.message || '获取订单失败',
            icon: 'none'
          });
        }

        this.setData({ isLoading: false });
        typeof callback === 'function' && callback();
      },
      fail: (err) => {
        console.error('获取订单失败', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
        this.setData({ isLoading: false });
        typeof callback === 'function' && callback();
      }
    });
  },

  // 加载更多订单
  loadMoreOrders: function () {
    this.setData({
      page: this.data.page + 1
    });
    this.fetchOrders();
  },

  // 切换筛选条件
  changeFilter: function (e) {
    const filter = e.currentTarget.dataset.filter;

    if (filter !== this.data.currentFilter) {
      const filterTextMap = {
        'all': '全部',
        'pending': '待接单',
        'assigned': '已分配',
        'in_progress': '进行中',
        'completed': '已完成'
      };

      this.setData({
        currentFilter: filter,
        currentFilterText: filterTextMap[filter] || '全部',
        page: 1,
        orders: [],
        hasMore: true
      });

      this.fetchOrders();
    }
  },

  // 查看订单详情
  viewOrderDetail: function (e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/orders/detail?id=${orderId}`
    });
  },

  // 接单
  acceptOrder: function (e) {
    e.stopPropagation();
    const orderId = e.currentTarget.dataset.id;
    const order = this.data.orders.find(o => o.id == orderId);

    // 显示确认对话框，包含订单详细信息
    wx.showModal({
      title: '确认接单',
      content: `订单：${order.title}\n取货地址：${order.pickup_address}\n送货地址：${order.delivery_address}\n金额：¥${order.amount}\n\n您确定要接下这个订单吗？`,
      confirmText: '确认接单',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          app.request({
            url: `/orders/${orderId}/assign`,
            method: 'PUT',
            data: {
              assigneeId: app.globalData.userInfo.id  // 指定接单人ID
            },
            success: (res) => {
              if (res.success) {
                wx.showToast({
                  title: '接单成功',
                  icon: 'success',
                  duration: 2000
                });

                // 刷新列表
                setTimeout(() => {
                  if (this.data.isPageDestroyed) return;
                  this.setData({
                    page: 1,
                    orders: []
                  });
                  this.fetchOrders();
                }, 1500);
              } else {
                wx.showToast({
                  title: res.message || '接单失败',
                  icon: 'none',
                  duration: 2000
                });
              }
            },
            fail: (err) => {
              console.error('接单失败', err);
              wx.showToast({
                title: '网络连接失败',
                icon: 'none',
                duration: 2000
              });
            }
          });
        }
      }
    });
  },

  // 开始处理订单
  startOrder: function (e) {
    e.stopPropagation();
    const orderId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认开始',
      content: '您确定要开始处理这个订单吗？',
      success: (res) => {
        if (res.confirm) {
          app.request({
            url: `/orders/${orderId}/start`,
            method: 'PUT',
            success: (res) => {
              if (res.success) {
                wx.showToast({
                  title: '订单开始处理',
                  icon: 'success'
                });

                // 刷新列表
                setTimeout(() => {
                  if (this.data.isPageDestroyed) return;
                  this.setData({
                    page: 1,
                    orders: []
                  });
                  this.fetchOrders();
                }, 1000);
              } else {
                wx.showToast({
                  title: res.message || '操作失败',
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              console.error('开始处理订单失败', err);
              wx.showToast({
                title: '网络请求失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 完成订单
  completeOrder: function (e) {
    e.stopPropagation();
    const orderId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认完成',
      content: '您确定已完成该订单吗？',
      success: (res) => {
        if (res.confirm) {
          app.request({
            url: `/orders/${orderId}/complete`,
            method: 'PUT',
            success: (res) => {
              if (res.success) {
                wx.showToast({
                  title: '订单已完成',
                  icon: 'success'
                });

                // 刷新列表
                setTimeout(() => {
                  if (this.data.isPageDestroyed) return;
                  this.setData({
                    page: 1,
                    orders: []
                  });
                  this.fetchOrders();
                }, 1000);
              } else {
                wx.showToast({
                  title: res.message || '操作失败',
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              console.error('完成订单失败', err);
              wx.showToast({
                title: '网络请求失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 状态文本转换
  getStatusText: function (status) {
    const statusMap = {
      'pending': '待分配',
      'assigned': '已分配',
      'in_progress': '进行中',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  },

  // 时间格式化
  formatTime: function (timeString) {
    if (!timeString) return '';

    const date = new Date(timeString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  // 阻止事件冒泡
  stopPropagation: function (e) {
    e.stopPropagation();
  }
});