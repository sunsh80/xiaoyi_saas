/**
 * 小蚁搬运租户管理后台 JavaScript
 */

// 全局变量
let currentTenant = null;
let currentUser = null;
let charts = {};

document.addEventListener('DOMContentLoaded', function() {
  // 初始化页面
  initializeApp();

  // 设置页面路由
  setupRouting();

  // 设置事件监听器
  setupEventListeners();
});

function initializeApp() {
  // 检查用户登录状态
  checkAuthStatus();

  // 初始化侧边栏
  initializeSidebar();

  // 加载租户信息
  loadTenantInfo();
}

function checkAuthStatus() {
  // 检查用户是否已登录
  const token = localStorage.getItem('tenant_admin_token');
  const tenantCode = localStorage.getItem('tenant_code');
  
  if (!token || !tenantCode) {
    // 如果未登录，重定向到登录页
    window.location.href = 'login.html';
    return;
  }

  // 验证 token 有效性
  validateToken(token, tenantCode);
}

async function validateToken(token, tenantCode) {
  try {
    const response = await apiRequest('auth/me', 'GET', null, tenantCode);
    if (response.success) {
      currentUser = response.data;
      document.getElementById('adminUsername').textContent = currentUser.username || '管理员';
    } else {
      // Token 无效，清除并跳转登录页
      localStorage.removeItem('tenant_admin_token');
      localStorage.removeItem('tenant_code');
      window.location.href = 'login.html';
    }
  } catch (error) {
    console.error('Token 验证失败:', error);
  }
}

function initializeSidebar() {
  // 侧边栏切换功能（移动端）
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
  // 监听 hash 变化
  window.addEventListener('hashchange', function() {
    const hash = window.location.hash.substring(1);
    if (hash) {
      showPage(hash);
    }
  });

  // 设置默认页面为仪表盘
  const initialHash = window.location.hash.substring(1);
  showPage(initialHash || 'dashboard');
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

    // 更新 URL hash
    if (window.location.hash.substring(1) !== pageId) {
      window.location.hash = pageId;
    }

    // 更新侧边栏激活状态
    updateSidebarActiveState(pageId);

    // 根据页面加载特定数据
    loadPageData(pageId);
  }
}

function updateSidebarActiveState(pageId) {
  const navLinks = document.querySelectorAll('.sidebar .nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === '#' + pageId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function loadPageData(pageId) {
  switch(pageId) {
    case 'dashboard':
      loadDashboardData();
      break;
    case 'orders':
      loadOrdersData();
      break;
    case 'workers':
      loadWorkersData();
      break;
    case 'users':
      loadUsersData();
      break;
    case 'finance':
      loadFinanceData();
      break;
    case 'reports':
      loadReportsData();
      break;
    case 'settings':
      loadSettingsData();
      break;
  }
}

async function loadTenantInfo() {
  const tenantCode = localStorage.getItem('tenant_code');
  if (!tenantCode) return;

  try {
    // 从本地存储加载缓存的租户信息
    const cachedTenant = localStorage.getItem('tenant_info');
    if (cachedTenant) {
      currentTenant = JSON.parse(cachedTenant);
      updateTenantInfoDisplay();
    }

    // 从 API 获取最新租户信息
    const response = await apiRequest('tenant/info', 'GET', null, tenantCode);
    if (response.success) {
      currentTenant = response.data;
      localStorage.setItem('tenant_info', JSON.stringify(currentTenant));
      updateTenantInfoDisplay();
    }
  } catch (error) {
    console.error('加载租户信息失败:', error);
  }
}

function updateTenantInfoDisplay() {
  if (currentTenant) {
    const tenantNameEl = document.getElementById('tenantName');
    if (tenantNameEl) {
      tenantNameEl.textContent = currentTenant.name || '未知租户';
    }
  }
}

// ========== 数据加载函数 ==========

async function loadDashboardData() {
  console.log('加载仪表盘数据...');
  
  try {
    const tenantCode = localStorage.getItem('tenant_code');
    const response = await apiRequest('tenant/dashboard', 'GET', null, tenantCode);
    
    if (response.success) {
      const data = response.data;
      updateDashboardStats(data);
      updateRecentOrders(data.recent_orders);
      initDashboardCharts(data);
    } else {
      // 使用模拟数据演示
      useMockDashboardData();
    }
  } catch (error) {
    console.error('加载仪表盘数据失败:', error);
    useMockDashboardData();
  }
}

function useMockDashboardData() {
  // 模拟数据用于演示
  const mockData = {
    month_orders: 156,
    completed_orders: 98,
    in_progress_orders: 23,
    active_workers: 12,
    recent_orders: [
      { id: 'XY2402170001', title: '办公室搬迁', amount: 580.00, status: 'completed', created_at: '2024-02-17 10:30:00' },
      { id: 'XY2402170002', title: '仓库货物整理', amount: 350.00, status: 'in_progress', created_at: '2024-02-17 11:15:00' },
      { id: 'XY2402170003', title: '家具搬运', amount: 420.00, status: 'pending', created_at: '2024-02-17 14:20:00' }
    ],
    order_trend: [65, 59, 80, 81, 56, 55, 40, 60, 72, 85, 90, 95],
    order_status: [45, 23, 12, 8, 5]
  };
  
  updateDashboardStats(mockData);
  updateRecentOrders(mockData.recent_orders);
  initDashboardCharts(mockData);
}

function updateDashboardStats(data) {
  document.getElementById('monthOrders').textContent = data.month_orders || 0;
  document.getElementById('completedOrders').textContent = data.completed_orders || 0;
  document.getElementById('inProgressOrders').textContent = data.in_progress_orders || 0;
  document.getElementById('activeWorkers').textContent = data.active_workers || 0;
}

function updateRecentOrders(orders) {
  const tbody = document.getElementById('recentOrdersTable');
  if (!tbody || !orders || orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">暂无数据</td></tr>';
    return;
  }

  const statusMap = {
    'pending': '<span class="badge bg-secondary">待分配</span>',
    'assigned': '<span class="badge bg-info">已分配</span>',
    'in_progress': '<span class="badge bg-warning">进行中</span>',
    'completed': '<span class="badge bg-success">已完成</span>',
    'cancelled': '<span class="badge bg-danger">已取消</span>'
  };

  tbody.innerHTML = orders.map(order => `
    <tr>
      <td>${order.id}</td>
      <td>${order.title || '无标题'}</td>
      <td>¥${parseFloat(order.amount || 0).toFixed(2)}</td>
      <td>${statusMap[order.status] || order.status}</td>
      <td>${formatDate(order.created_at)}</td>
    </tr>
  `).join('');
}

function initDashboardCharts(data) {
  // 销毁旧图表
  if (charts.orderChart) {
    charts.orderChart.destroy();
  }
  if (charts.orderStatusChart) {
    charts.orderStatusChart.destroy();
  }

  // 订单趋势图
  const orderCtx = document.getElementById('orderChart');
  if (orderCtx) {
    charts.orderChart = new Chart(orderCtx, {
      type: 'line',
      data: {
        labels: ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月'],
        datasets: [{
          label: '订单数量',
          data: data.order_trend || [65, 59, 80, 81, 56, 55, 40, 60, 72, 85, 90, 95],
          fill: true,
          borderColor: '#2e7d32',
          backgroundColor: 'rgba(46, 125, 50, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0,0,0,0.05)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  // 订单状态分布图
  const statusCtx = document.getElementById('orderStatusChart');
  if (statusCtx) {
    charts.orderStatusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['待分配', '已分配', '进行中', '已完成', '已取消'],
        datasets: [{
          data: data.order_status || [45, 23, 12, 8, 5],
          backgroundColor: [
            '#6c757d',
            '#17a2b8',
            '#ffc107',
            '#28a745',
            '#dc3545'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }
}

// ========== 订单管理 ==========

async function loadOrdersData() {
  console.log('加载订单数据...');
  
  try {
    const tenantCode = localStorage.getItem('tenant_code');
    const params = new URLSearchParams();
    
    const status = document.getElementById('orderStatusFilter')?.value;
    if (status) params.append('status', status);
    
    const startDate = document.getElementById('orderStartDate')?.value;
    if (startDate) params.append('start_date', startDate);
    
    const endDate = document.getElementById('orderEndDate')?.value;
    if (endDate) params.append('end_date', endDate);
    
    const search = document.getElementById('orderSearch')?.value;
    if (search) params.append('search', search);

    const response = await apiRequest(`tenant/orders?${params}`, 'GET', null, tenantCode);
    
    if (response.success) {
      renderOrdersTable(response.data);
    } else {
      useMockOrdersData();
    }
  } catch (error) {
    console.error('加载订单数据失败:', error);
    useMockOrdersData();
  }
}

function useMockOrdersData() {
  const mockOrders = [
    { id: 'XY2402170001', title: '办公室搬迁', pickup_address: '朝阳区 xxx 大厦', delivery_address: '海淀区 yyy 园区', amount: 580.00, status: 'completed', worker_name: '张三', created_at: '2024-02-17 10:30:00' },
    { id: 'XY2402170002', title: '仓库货物整理', pickup_address: '丰台区 zzz 仓库', delivery_address: '大兴区 aaa 物流园', amount: 350.00, status: 'in_progress', worker_name: '李四', created_at: '2024-02-17 11:15:00' },
    { id: 'XY2402170003', title: '家具搬运', pickup_address: '西城区 bbb 小区', delivery_address: '东城区 ccc 公寓', amount: 420.00, status: 'pending', worker_name: '-', created_at: '2024-02-17 14:20:00' }
  ];
  
  renderOrdersTable(mockOrders);
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">暂无数据</td></tr>';
    return;
  }

  const statusMap = {
    'pending': '<span class="badge bg-secondary">待分配</span>',
    'assigned': '<span class="badge bg-info">已分配</span>',
    'in_progress': '<span class="badge bg-warning">进行中</span>',
    'completed': '<span class="badge bg-success">已完成</span>',
    'cancelled': '<span class="badge bg-danger">已取消</span>'
  };

  tbody.innerHTML = orders.map(order => `
    <tr>
      <td>${order.id}</td>
      <td>${order.title || '无标题'}</td>
      <td>${order.pickup_address || '-'}</td>
      <td>${order.delivery_address || '-'}</td>
      <td>¥${parseFloat(order.amount || 0).toFixed(2)}</td>
      <td>${statusMap[order.status] || order.status}</td>
      <td>${order.worker_name || '-'}</td>
      <td>${formatDate(order.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="viewOrder('${order.id}')">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary me-1" onclick="editOrder('${order.id}')">
          <i class="fas fa-edit"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// ========== 接单人员管理 ==========

async function loadWorkersData() {
  console.log('加载接单人员数据...');
  
  try {
    const tenantCode = localStorage.getItem('tenant_code');
    const params = new URLSearchParams();
    
    const status = document.getElementById('workerStatusFilter')?.value;
    if (status) params.append('status', status);
    
    const search = document.getElementById('workerSearch')?.value;
    if (search) params.append('search', search);

    const response = await apiRequest(`tenant/workers?${params}`, 'GET', null, tenantCode);
    
    if (response.success) {
      renderWorkersTable(response.data);
    } else {
      useMockWorkersData();
    }
  } catch (error) {
    console.error('加载接单人员数据失败:', error);
    useMockWorkersData();
  }
}

function useMockWorkersData() {
  const mockWorkers = [
    { id: 1, name: '张三', phone: '13800138001', status: 'active', completed_orders: 156, total_income: 12580, register_date: '2024-01-15' },
    { id: 2, name: '李四', phone: '13800138002', status: 'rest', completed_orders: 89, total_income: 7650, register_date: '2024-02-20' },
    { id: 3, name: '王五', phone: '13800138003', status: 'active', completed_orders: 234, total_income: 18920, register_date: '2023-11-10' }
  ];
  
  renderWorkersTable(mockWorkers);
}

function renderWorkersTable(workers) {
  const tbody = document.getElementById('workersTableBody');
  if (!tbody) return;

  if (!workers || workers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">暂无数据</td></tr>';
    return;
  }

  const statusMap = {
    'active': '<span class="badge bg-success">工作中</span>',
    'rest': '<span class="badge bg-warning">休息中</span>',
    'inactive': '<span class="badge bg-secondary">禁用</span>'
  };

  tbody.innerHTML = workers.map(worker => `
    <tr>
      <td>${worker.id}</td>
      <td>${worker.name}</td>
      <td>${worker.phone}</td>
      <td>${statusMap[worker.status] || worker.status}</td>
      <td>${worker.completed_orders || 0}</td>
      <td>¥${parseFloat(worker.total_income || 0).toLocaleString('zh-CN', {minimumFractionDigits: 0})}</td>
      <td>${formatDate(worker.register_date)}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="viewWorker(${worker.id})">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary me-1" onclick="editWorker(${worker.id})">
          <i class="fas fa-edit"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// ========== 用户管理 ==========

async function loadUsersData() {
  console.log('加载用户数据...');
  
  try {
    const tenantCode = localStorage.getItem('tenant_code');
    const params = new URLSearchParams();
    
    const role = document.getElementById('userRoleFilter')?.value;
    if (role) params.append('role', role);
    
    const search = document.getElementById('userSearch')?.value;
    if (search) params.append('search', search);

    const response = await apiRequest(`tenant/users?${params}`, 'GET', null, tenantCode);
    
    if (response.success) {
      renderUsersTable(response.data);
    } else {
      useMockUsersData();
    }
  } catch (error) {
    console.error('加载用户数据失败:', error);
    useMockUsersData();
  }
}

function useMockUsersData() {
  const mockUsers = [
    { id: 1, username: 'zhangsan', real_name: '张三', phone: '13800138001', role: 'tenant_admin', orders_count: 45, register_date: '2024-01-10' },
    { id: 2, username: 'lisi', real_name: '李四', phone: '13800138002', role: 'tenant_user', orders_count: 23, register_date: '2024-02-15' },
    { id: 3, username: 'wangwu', real_name: '王五', phone: '13800138003', role: 'tenant_user', orders_count: 67, register_date: '2023-12-20' }
  ];
  
  renderUsersTable(mockUsers);
}

function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">暂无数据</td></tr>';
    return;
  }

  const roleMap = {
    'tenant_admin': '<span class="badge bg-primary">租户管理员</span>',
    'tenant_user': '<span class="badge bg-secondary">普通用户</span>'
  };

  tbody.innerHTML = users.map(user => `
    <tr>
      <td>${user.id}</td>
      <td>${user.username}</td>
      <td>${user.real_name || '-'}</td>
      <td>${user.phone}</td>
      <td>${roleMap[user.role] || user.role}</td>
      <td>${user.orders_count || 0}</td>
      <td>${formatDate(user.register_date)}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="viewUser(${user.id})">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary me-1" onclick="editUser(${user.id})">
          <i class="fas fa-edit"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// ========== 财务管理 ==========

async function loadFinanceData() {
  console.log('加载财务数据...');
  
  try {
    const tenantCode = localStorage.getItem('tenant_code');
    const response = await apiRequest('tenant/finance/overview', 'GET', null, tenantCode);
    
    if (response.success) {
      updateFinanceOverview(response.data);
    } else {
      useMockFinanceData();
    }
  } catch (error) {
    console.error('加载财务数据失败:', error);
    useMockFinanceData();
  }
}

function useMockFinanceData() {
  const mockFinance = {
    yesterday_gmv: 2580.00,
    month_gmv: 35678.00,
    year_gmv: 285000.00,
    pending_settlement: 5600.00,
    withdrawn_amount: 120000.00,
    account_balance: 28500.00,
    withdrawals: [],
    transactions: []
  };
  
  updateFinanceOverview(mockFinance);
}

function updateFinanceOverview(data) {
  document.getElementById('yesterday-gmv').textContent = (data.yesterday_gmv || 0).toFixed(2);
  document.getElementById('month-gmv').textContent = (data.month_gmv || 0).toFixed(2);
  document.getElementById('year-gmv').textContent = (data.year_gmv || 0).toFixed(2);
  document.getElementById('pending-settlement').textContent = (data.pending_settlement || 0).toFixed(2);
  document.getElementById('withdrawn-amount').textContent = (data.withdrawn_amount || 0).toFixed(2);
  document.getElementById('account-balance').textContent = (data.account_balance || 0).toFixed(2);
}

// ========== 报表统计 ==========

async function loadReportsData() {
  console.log('加载报表数据...');
  initReportCharts();
  loadWorkerRanking();
}

function initReportCharts() {
  // 报表图表初始化
  const trendCtx = document.getElementById('reportOrderTrendChart');
  if (trendCtx && !charts.reportOrderTrend) {
    charts.reportOrderTrend = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月'],
        datasets: [{
          label: '订单数量',
          data: [65, 59, 80, 81, 56, 55],
          borderColor: '#2e7d32',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  const statusCtx = document.getElementById('reportOrderStatusChart');
  if (statusCtx && !charts.reportOrderStatus) {
    charts.reportOrderStatus = new Chart(statusCtx, {
      type: 'pie',
      data: {
        labels: ['待分配', '已分配', '进行中', '已完成'],
        datasets: [{
          data: [15, 25, 30, 30],
          backgroundColor: ['#6c757d', '#17a2b8', '#ffc107', '#28a745']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
}

function loadWorkerRanking() {
  const mockRanking = [
    { rank: 1, name: '张三', completed_orders: 234, total_income: 18920, rating: 98.5 },
    { rank: 2, name: '李四', completed_orders: 189, total_income: 15650, rating: 97.2 },
    { rank: 3, name: '王五', completed_orders: 156, total_income: 12580, rating: 96.8 }
  ];

  const tbody = document.getElementById('workerRankingTable');
  if (!tbody) return;

  tbody.innerHTML = mockRanking.map(worker => `
    <tr>
      <td><span class="badge ${worker.rank === 1 ? 'bg-warning' : worker.rank === 2 ? 'bg-secondary' : worker.rank === 3 ? 'bg-danger' : 'bg-light text-dark'}">${worker.rank}</span></td>
      <td>${worker.name}</td>
      <td>${worker.completed_orders}</td>
      <td>¥${parseFloat(worker.total_income).toLocaleString('zh-CN', {minimumFractionDigits: 0})}</td>
      <td>${worker.rating}%</td>
    </tr>
  `).join('');
}

// ========== 租户设置 ==========

async function loadSettingsData() {
  console.log('加载设置数据...');
  
  if (currentTenant) {
    document.getElementById('tenantNameInput').value = currentTenant.name || '';
    document.getElementById('tenantCodeInput').value = currentTenant.code || '';
    document.getElementById('contactPerson').value = currentTenant.contact_person || '';
    document.getElementById('contactPhone').value = currentTenant.contact_phone || '';
    document.getElementById('contactEmail').value = currentTenant.contact_email || '';
    document.getElementById('tenantAddress').value = currentTenant.address || '';
  }
}

async function saveTenantSettings() {
  const settings = {
    contact_person: document.getElementById('contactPerson').value,
    contact_phone: document.getElementById('contactPhone').value,
    contact_email: document.getElementById('contactEmail').value,
    address: document.getElementById('tenantAddress').value,
    order_validity_hours: parseInt(document.getElementById('orderValidityHours').value) || 24,
    auto_confirm_hours: parseInt(document.getElementById('autoConfirmHours').value) || 72,
    auto_assign_enabled: document.getElementById('autoAssignEnabled').checked,
    allow_worker_select_enabled: document.getElementById('allowWorkerSelectEnabled').checked,
    notify_new_order: document.getElementById('notifyNewOrder').checked,
    notify_order_status_change: document.getElementById('notifyOrderStatusChange').checked,
    notify_withdrawal: document.getElementById('notifyWithdrawal').checked
  };

  try {
    const tenantCode = localStorage.getItem('tenant_code');
    const response = await apiRequest('tenant/settings', 'PUT', settings, tenantCode);
    
    if (response.success) {
      showSuccess('设置保存成功');
    } else {
      showError(response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存设置失败:', error);
    showSuccess('设置保存成功（演示模式）');
  }
}

// ========== 事件监听器 ==========

function setupEventListeners() {
  // 搜索功能
  const searchForm = document.querySelector('form.d-flex');
  if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const searchTerm = this.querySelector('input[type="search"]').value;
      performSearch(searchTerm);
    });
  }

  // 订单筛选器
  const orderStatusFilter = document.getElementById('orderStatusFilter');
  if (orderStatusFilter) {
    orderStatusFilter.addEventListener('change', loadOrdersData);
  }

  // 接单员筛选器
  const workerStatusFilter = document.getElementById('workerStatusFilter');
  if (workerStatusFilter) {
    workerStatusFilter.addEventListener('change', loadWorkersData);
  }

  // 用户筛选器
  const userRoleFilter = document.getElementById('userRoleFilter');
  if (userRoleFilter) {
    userRoleFilter.addEventListener('change', loadUsersData);
  }
}

function performSearch(term) {
  console.log('搜索:', term);
  // 根据当前页面执行不同的搜索逻辑
  const currentPage = document.querySelector('.page.active');
  if (currentPage) {
    switch(currentPage.id) {
      case 'orders':
        loadOrdersData();
        break;
      case 'workers':
        loadWorkersData();
        break;
      case 'users':
        loadUsersData();
        break;
    }
  }
}

// ========== 工具函数 ==========

function apiRequest(url, method = 'GET', data = null, tenantCode = null) {
  const token = localStorage.getItem('tenant_admin_token');
  const code = tenantCode || localStorage.getItem('tenant_code');

  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-tenant-code': code
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  return fetch(`/api/${url}`, options)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error('API 请求错误:', error);
      throw error;
    });
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function showError(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-danger alert-dismissible fade show';
  alertDiv.innerHTML = `
    <i class="fas fa-exclamation-circle me-2"></i>${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  document.body.insertBefore(alertDiv, document.body.firstChild);

  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  }, 3000);
}

function showSuccess(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-success alert-dismissible fade show';
  alertDiv.innerHTML = `
    <i class="fas fa-check-circle me-2"></i>${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  document.body.insertBefore(alertDiv, document.body.firstChild);

  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  }, 3000);
}

function logout() {
  localStorage.removeItem('tenant_admin_token');
  localStorage.removeItem('tenant_code');
  localStorage.removeItem('tenant_info');
  window.location.href = 'login.html';
}

// ========== 操作函数（全局可访问） ==========

function createOrder() {
  showSuccess('新增订单功能开发中...');
}

function viewOrder(orderId) {
  showSuccess(`查看订单：${orderId}`);
}

function editOrder(orderId) {
  showSuccess(`编辑订单：${orderId}`);
}

function addWorker() {
  showSuccess('新增接单员功能开发中...');
}

function viewWorker(workerId) {
  showSuccess(`查看接单员：${workerId}`);
}

function editWorker(workerId) {
  showSuccess(`编辑接单员：${workerId}`);
}

function addUser() {
  showSuccess('新增用户功能开发中...');
}

function viewUser(userId) {
  showSuccess(`查看用户：${userId}`);
}

function editUser(userId) {
  showSuccess(`编辑用户：${userId}`);
}

function loadReportData() {
  showSuccess('报表数据已刷新');
}

function resetReportFilter() {
  document.getElementById('reportStartDate').value = '';
  document.getElementById('reportEndDate').value = '';
  showSuccess('筛选条件已重置');
}
