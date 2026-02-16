/**
 * 小蚁搬运总后台管理系统 JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
  // 初始化页面
  initializeApp();
  
  // 设置页面路由
  setupRouting();
  
  // 初始化图表
  initCharts();
  
  // 设置事件监听器
  setupEventListeners();
});

function initializeApp() {
  // 检查用户登录状态
  checkAuthStatus();
  
  // 初始化侧边栏
  initializeSidebar();
  
  // 加载初始数据
  loadInitialData();
}

function checkAuthStatus() {
  // 检查用户是否已登录
  const token = localStorage.getItem('admin_token');
  if (!token) {
    // 如果未登录，重定向到登录页
    window.location.href = 'login.html';
  }
}

function initializeSidebar() {
  // 侧边栏切换功能
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function() {
      document.querySelector('.sidebar').classList.toggle('active');
    });
  }
  
  // 侧边栏菜单激活状态
  const navLinks = document.querySelectorAll('.sidebar .nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // 移除所有激活状态
      navLinks.forEach(l => l.classList.remove('active'));
      
      // 添加当前激活状态
      this.classList.add('active');
      
      // 获取目标页面
      const target = this.getAttribute('href').substring(1);
      
      // 显示对应页面
      showPage(target);
    });
  });
}

function setupRouting() {
  // 设置默认页面为仪表盘
  showPage('dashboard');
}

function showPage(pageId) {
  // 隐藏所有页面
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => {
    page.classList.remove('active');
  });
  
  // 显示目标页面
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active');
    
    // 根据页面加载特定数据
    switch(pageId) {
      case 'dashboard':
        loadDashboardData();
        break;
      case 'orders':
        loadOrdersData();
        break;
      case 'tenants':
        loadTenantsData();
        break;
      case 'workers':
        loadWorkersData();
        break;
      case 'users':
        loadUsersData();
        break;
      case 'reports':
        loadReportsData();
        break;
      case 'settings':
        loadSettingsData();
        break;
    }
  }
}

function loadInitialData() {
  // 加载初始数据
  console.log('加载初始数据...');
}

function loadDashboardData() {
  // 加载仪表盘数据
  console.log('加载仪表盘数据...');
  updateDashboardStats();
}

function loadOrdersData() {
  // 加载订单数据
  console.log('加载订单数据...');
  setupOrderFilters();
}

function loadTenantsData() {
  // 加载租户数据
  console.log('加载租户数据...');
  setupTenantFilters();
}

function loadWorkersData() {
  // 加载接单人员数据
  console.log('加载接单人员数据...');
}

function loadUsersData() {
  // 加载用户数据
  console.log('加载用户数据...');
}

function loadReportsData() {
  // 加载报表数据
  console.log('加载报表数据...');
}

function loadSettingsData() {
  // 加载设置数据
  console.log('加载设置数据...');
}

function setupOrderFilters() {
  // 设置订单筛选器
  const statusFilter = document.getElementById('orderStatusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', function() {
      filterOrdersByStatus(this.value);
    });
  }
}

function setupTenantFilters() {
  // 设置租户筛选器
  const statusFilter = document.getElementById('tenantStatusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', function() {
      filterTenantsByStatus(this.value);
    });
  }
}

function filterOrdersByStatus(status) {
  // 根据状态筛选订单
  console.log('按状态筛选订单:', status);
  // 实现筛选逻辑
}

function filterTenantsByStatus(status) {
  // 根据状态筛选租户
  console.log('按状态筛选租户:', status);
  // 实现筛选逻辑
}

function updateDashboardStats() {
  // 更新仪表盘统计数据
  console.log('更新仪表盘统计数据...');
  // 这里可以从API获取最新的统计数据
}

function initCharts() {
  // 初始化仪表盘图表
  initOrderChart();
  initTenantChart();
}

function initOrderChart() {
  // 初始化订单趋势图表
  const ctx = document.getElementById('orderChart');
  if (ctx) {
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        datasets: [{
          label: '订单数量',
          data: [65, 59, 80, 81, 56, 55, 40, 60, 72, 85, 90, 95],
          fill: false,
          borderColor: '#00BCD4',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: '年度订单趋势'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
}

function initTenantChart() {
  // 初始化租户分布图表
  const ctx = document.getElementById('tenantChart');
  if (ctx) {
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['商户型', '物流型', '搬家型', '其他'],
        datasets: [{
          data: [35, 25, 20, 20],
          backgroundColor: [
            '#00BCD4',
            '#4CAF50',
            '#FF9800',
            '#9C27B0'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: '租户类型分布'
          }
        }
      }
    });
  }
}

function setupEventListeners() {
  // 设置各种事件监听器
  
  // 搜索功能
  const searchForm = document.querySelector('form.d-flex');
  if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const searchTerm = this.querySelector('input[type="search"]').value;
      performSearch(searchTerm);
    });
  }
  
  // 订单表格操作按钮
  setupOrderTableActions();
  
  // 租户表格操作按钮
  setupTenantTableActions();
}

function performSearch(term) {
  // 执行搜索
  console.log('搜索:', term);
  // 实现搜索逻辑
}

function setupOrderTableActions() {
  // 设置订单表格操作
  const orderRows = document.querySelectorAll('#orders tbody tr');
  orderRows.forEach(row => {
    const editBtn = row.querySelector('.btn-outline-primary');
    const detailBtn = row.querySelector('.btn-outline-info');
    
    if (editBtn) {
      editBtn.addEventListener('click', function() {
        const orderId = row.cells[0].textContent;
        editOrder(orderId);
      });
    }
    
    if (detailBtn) {
      detailBtn.addEventListener('click', function() {
        const orderId = row.cells[0].textContent;
        viewOrderDetails(orderId);
      });
    }
  });
}

function setupTenantTableActions() {
  // 设置租户表格操作
  const tenantRows = document.querySelectorAll('#tenants tbody tr');
  tenantRows.forEach(row => {
    const editBtn = row.querySelector('.btn-outline-primary');
    const deleteBtn = row.querySelector('.btn-outline-danger');
    const activateBtn = row.querySelector('.btn-outline-success');
    
    if (editBtn) {
      editBtn.addEventListener('click', function() {
        const tenantId = row.cells[0].textContent;
        editTenant(tenantId);
      });
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function() {
        const tenantId = row.cells[0].textContent;
        deleteTenant(tenantId);
      });
    }
    
    if (activateBtn) {
      activateBtn.addEventListener('click', function() {
        const tenantId = row.cells[0].textContent;
        activateTenant(tenantId);
      });
    }
  });
}

function editOrder(orderId) {
  // 编辑订单
  console.log('编辑订单:', orderId);
  // 实现编辑订单逻辑
}

function viewOrderDetails(orderId) {
  // 查看订单详情
  console.log('查看订单详情:', orderId);
  // 实现查看订单详情逻辑
}

function editTenant(tenantId) {
  // 编辑租户
  console.log('编辑租户:', tenantId);
  // 实现编辑租户逻辑
}

function deleteTenant(tenantId) {
  // 删除租户
  console.log('删除租户:', tenantId);
  // 实现删除租户逻辑
}

function activateTenant(tenantId) {
  // 启用租户
  console.log('启用租户:', tenantId);
  // 实现启用租户逻辑
}

// API请求函数
function apiRequest(url, method = 'GET', data = null) {
  const token = localStorage.getItem('admin_token');
  
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  return fetch(`/api/admin/${url}`, options)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error('API请求错误:', error);
      showError('请求失败，请稍后重试');
    });
}

// 显示错误信息
function showError(message) {
  // 创建错误提示
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-danger alert-dismissible fade show';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  // 添加到页面顶部
  document.body.insertBefore(alertDiv, document.body.firstChild);
  
  // 3秒后自动移除
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  }, 3000);
}

// 显示成功信息
function showSuccess(message) {
  // 创建成功提示
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-success alert-dismissible fade show';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  // 添加到页面顶部
  document.body.insertBefore(alertDiv, document.body.firstChild);
  
  // 3秒后自动移除
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  }, 3000);
}

// 退出登录
function logout() {
  // 清除本地存储的token
  localStorage.removeItem('admin_token');
  
  // 重定向到登录页
  window.location.href = 'login.html';
}

// 日期格式化工具
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 数字格式化工具
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}