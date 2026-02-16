// pages/orders/detail.js
const app = getApp();

Page({
  data: {
    order: null,
    orderLogs: [],
    userRole: '',
    canAcceptOrder: false,
    canStartOrder: false,
    canCompleteOrder: false,
    isPageDestroyed: false
  },

  onLoad: function (options) {
    const orderId = options.id;
    this.setData({
      orderId: orderId
    });

    // 获取用户角色
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({
        userRole: userInfo.role
      });
    }

    // 获取订单详情
    this.fetchOrderDetail();
  },

  onShow: function () {
    // 页面显示时刷新订单详情
    if (this.data.orderId) {
      this.fetchOrderDetail();
    }
  },

  onUnload: function () {
    this.setData({
      isPageDestroyed: true
    });
  },

  // 获取订单详情
  fetchOrderDetail: function () {
    app.request({
      url: `/orders/${this.data.orderId}`,
      method: 'GET',
      success: (res) => {
        if (res.success) {
          const order = res.data.order;
          const canAccept = this.canAcceptOrder(order);
          const canStart = this.canStartOrder(order);
          const canComplete = this.canCompleteOrder(order);

          this.setData({
            order: order,
            canAcceptOrder: canAccept,
            canStartOrder: canStart,
            canCompleteOrder: canComplete
          });

          // 获取订单操作日志
          this.fetchOrderLogs();
        } else {
          wx.showToast({
            title: res.message || '获取订单详情失败',
            icon: 'none'
          });

          // 返回上一页
          setTimeout(() => {
            if (this.data.isPageDestroyed) return;
            wx.navigateBack();
          }, 1500);
        }
      },
      fail: (err) => {
        console.error('获取订单详情失败', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },

  // 获取订单操作日志
  fetchOrderLogs: function () {
    // 这里可以调用获取订单操作日志的API
    // 暂时使用模拟数据
    const mockLogs = [
      {
        id: 1,
        operation_type: '订单创建',
        description: '订单已成功创建',
        operator_name: '系统',
        created_at: this.data.order?.created_at
      }
    ];

    // 如果订单有分配记录
    if (this.data.order?.assign_time) {
      mockLogs.push({
        id: 2,
        operation_type: '订单分配',
        description: `订单已分配给${this.data.order.assignee_user_name || '接单人员'}`,
        operator_name: '系统',
        created_at: this.data.order.assign_time
      });
    }

    // 如果订单有完成记录
    if (this.data.order?.complete_time) {
      mockLogs.push({
        id: 3,
        operation_type: '订单完成',
        description: '订单已完成',
        operator_name: this.data.order.assignee_user_name || '接单人员',
        created_at: this.data.order.complete_time
      });
    }

    this.setData({
      orderLogs: mockLogs
    });
  },

  // 检查是否可以接单
  canAcceptOrder: function (order) {
    return this.data.userRole === 'worker' && 
           order.status === 'pending' && 
           order.assignee_user_id === null;
  },

  // 检查是否可以开始订单
  canStartOrder: function (order) {
    return this.data.userRole === 'worker' && 
           order.status === 'assigned' && 
           order.assignee_user_id === app.globalData.userInfo.id;
  },

  // 检查是否可以完成订单
  canCompleteOrder: function (order) {
    return this.data.userRole === 'worker' && 
           order.status === 'in_progress' && 
           order.assignee_user_id === app.globalData.userInfo.id;
  },

  // 接单
  acceptOrder: function () {
    const order = this.data.order;

    wx.showModal({
      title: '确认接单',
      content: `订单：${order.title}\n取货地址：${order.pickup_address}\n送货地址：${order.delivery_address}\n金额：¥${order.amount}\n\n您确定要接下这个订单吗？`,
      confirmText: '确认接单',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          app.request({
            url: `/orders/${this.data.orderId}/assign`,
            method: 'PUT',
            data: {
              assigneeId: app.globalData.userInfo.id
            },
            success: (res) => {
              if (res.success) {
                wx.showToast({
                  title: '接单成功',
                  icon: 'success',
                  duration: 2000
                });

                // 延迟刷新详情
                setTimeout(() => {
                  if (this.data.isPageDestroyed) return;
                  this.fetchOrderDetail();
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

  // 开始订单
  startOrder: function () {
    const order = this.data.order;

    wx.showModal({
      title: '确认开始处理',
      content: `订单：${order.title}\n取货地址：${order.pickup_address}\n送货地址：${order.delivery_address}\n\n您确定要开始处理这个订单吗？`,
      confirmText: '确认开始',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          app.request({
            url: `/orders/${this.data.orderId}/start`,
            method: 'PUT',
            success: (res) => {
              if (res.success) {
                wx.showToast({
                  title: '订单开始处理',
                  icon: 'success',
                  duration: 2000
                });

                // 延迟刷新详情
                setTimeout(() => {
                  if (this.data.isPageDestroyed) return;
                  this.fetchOrderDetail();
                }, 1500);
              } else {
                wx.showToast({
                  title: res.message || '操作失败',
                  icon: 'none',
                  duration: 2000
                });
              }
            },
            fail: (err) => {
              console.error('开始订单失败', err);
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

  // 完成订单
  completeOrder: function () {
    const order = this.data.order;

    wx.showModal({
      title: '确认完成订单',
      content: `订单：${order.title}\n取货地址：${order.pickup_address}\n送货地址：${order.delivery_address}\n金额：¥${order.amount}\n\n您确定已完成该订单吗？`,
      confirmText: '确认完成',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          app.request({
            url: `/orders/${this.data.orderId}/complete`,
            method: 'PUT',
            success: (res) => {
              if (res.success) {
                wx.showToast({
                  title: '订单已完成',
                  icon: 'success',
                  duration: 2000
                });

                // 延迟刷新详情
                setTimeout(() => {
                  if (this.data.isPageDestroyed) return;
                  this.fetchOrderDetail();
                }, 1500);
              } else {
                wx.showToast({
                  title: res.message || '操作失败',
                  icon: 'none',
                  duration: 2000
                });
              }
            },
            fail: (err) => {
              console.error('完成订单失败', err);
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

  // 查看地图
  viewOnMap: function () {
    const order = this.data.order;
    if (!order) return;

    // 显示确认对话框
    wx.showModal({
      title: '查看地图',
      content: `订单：${order.title}\n取货地址：${order.pickup_address}\n送货地址：${order.delivery_address}\n\n是否要在地图上查看取货地址？`,
      confirmText: '查看地图',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 使用微信内置地图打开位置
          wx.openLocation({
            latitude: parseFloat(order.pickup_lat || 0),
            longitude: parseFloat(order.pickup_lng || 0),
            name: '取货地址',
            address: order.pickup_address,
            scale: 18
          }).catch(err => {
            console.error('打开地图失败', err);
            wx.showToast({
              title: '打开地图失败',
              icon: 'none',
              duration: 2000
            });
          });
        }
      }
    });
  },

  // 拨打电话
  callPhone: function () {
    const order = this.data.order;
    if (!order) return;

    const phoneNumber = order.customer_phone || order.phone;
    if (!phoneNumber) {
      wx.showToast({
        title: '订单中没有电话号码',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.showModal({
      title: '确认拨打电话',
      content: `订单：${order.title}\n客户电话：${phoneNumber}\n\n您确定要拨打此电话吗？`,
      confirmText: '拨打',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: phoneNumber,
            success: () => {
              console.log('拨打电话成功');
            },
            fail: (err) => {
              console.error('拨打电话失败', err);
              wx.showToast({
                title: '拨打电话失败',
                icon: 'none',
                duration: 2000
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