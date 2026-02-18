/**
 * 总后台租户管理 JavaScript
 */

let currentTenantId = null;
let currentTenantCode = null;

// 加载租户列表
async function loadTenants() {
  const status = document.getElementById('tenantStatusFilter')?.value || '';
  const search = document.getElementById('tenantSearch')?.value || '';
  
  try {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    
    const response = await fetch(`/api/admin/tenants?${params}`);
    const result = await response.json();
    
    if (result.success) {
      renderTenantsTable(result.data);
      renderPagination(result.pagination);
    } else {
      showError('加载租户列表失败');
    }
  } catch (error) {
    console.error('加载租户列表错误:', error);
    showError('加载失败');
  }
}

// 渲染租户表格
function renderTenantsTable(tenants) {
  const tbody = document.getElementById('tenantsTableBody');
  if (!tbody) return;
  
  if (!tenants || tenants.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">暂无数据</td></tr>';
    return;
  }
  
  const statusMap = {
    0: '<span class="badge bg-warning">待审批</span>',
    1: '<span class="badge bg-success">启用</span>',
    2: '<span class="badge bg-secondary">已禁用</span>'
  };
  
  tbody.innerHTML = tenants.map(tenant => `
    <tr>
      <td>${tenant.tenant_code || '-'}</td>
      <td>${tenant.name}</td>
      <td>${tenant.contact_person || '-'}</td>
      <td>${tenant.contact_phone || '-'}</td>
      <td>${tenant.contact_email || '-'}</td>
      <td>${statusMap[tenant.status] || tenant.status}</td>
      <td>${formatDate(tenant.created_at)}</td>
      <td>
        ${tenant.status === 0 ? `
          <button class="btn btn-sm btn-success me-1" onclick="showApproveModal(${tenant.id}, '${tenant.tenant_code}', '${tenant.name}')">
            <i class="fas fa-check"></i> 审批
          </button>
        ` : `
          <button class="btn btn-sm btn-outline-primary me-1" onclick="viewTenantDetail(${tenant.id})">
            <i class="fas fa-eye"></i>
          </button>
          ${tenant.status === 1 ? `
            <button class="btn btn-sm btn-outline-warning me-1" onclick="toggleTenantStatus(${tenant.id}, 2)">
              <i class="fas fa-ban"></i>
            </button>
          ` : `
            <button class="btn btn-sm btn-outline-success me-1" onclick="toggleTenantStatus(${tenant.id}, 1)">
              <i class="fas fa-check"></i>
            </button>
          `}
          <button class="btn btn-sm btn-outline-danger" onclick="deleteTenant(${tenant.id})">
            <i class="fas fa-trash"></i>
          </button>
        `}
      </td>
    </tr>
  `).join('');
}

// 渲染分页
function renderPagination(pagination) {
  const ul = document.getElementById('tenantsPagination');
  if (!ul || !pagination) return;
  
  const { page, pages, total } = pagination;
  
  if (pages <= 1) {
    ul.innerHTML = '';
    return;
  }
  
  let html = `
    <li class="page-item ${page === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="gotoPage(${page - 1}); return false;">上一页</a>
    </li>
  `;
  
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2)) {
      html += `
        <li class="page-item ${i === page ? 'active' : ''}">
          <a class="page-link" href="#" onclick="gotoPage(${i}); return false;">${i}</a>
        </li>
      `;
    } else if (i === page - 3 || i === page + 3) {
      html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
  }
  
  html += `
    <li class="page-item ${page === pages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="gotoPage(${page + 1}); return false;">下一页</a>
    </li>
  `;
  
  ul.innerHTML = html;
}

// 跳转页面
function gotoPage(page) {
  const status = document.getElementById('tenantStatusFilter')?.value || '';
  const search = document.getElementById('tenantSearch')?.value || '';
  
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('limit', 20);
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  
  fetch(`/api/admin/tenants?${params}`)
    .then(res => res.json())
    .then(result => {
      if (result.success) {
        renderTenantsTable(result.data);
        renderPagination(result.pagination);
      }
    });
}

// 显示待审批租户
async function showPendingTenants() {
  document.getElementById('tenantStatusFilter').value = '0';
  await loadTenants();
}

// 显示审批模态框
function showApproveModal(id, code, name) {
  currentTenantId = id;
  currentTenantCode = code;
  
  document.getElementById('approveTenantName').textContent = name;
  document.getElementById('approveTenantCode').textContent = code;
  document.getElementById('customTenantCode').value = '';
  
  const modal = new bootstrap.Modal(document.getElementById('approveModal'));
  modal.show();
}

// 审批通过
async function approveTenant() {
  const customCode = document.getElementById('customTenantCode')?.value || '';
  
  try {
    const response = await fetch(`/api/admin/tenants/${currentTenantId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tenant_code: customCode || null
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess('审批通过成功');
      bootstrap.Modal.getInstance(document.getElementById('approveModal')).hide();
      loadTenants();
      loadPendingCount();
    } else {
      showError(result.message || '审批失败');
    }
  } catch (error) {
    console.error('审批错误:', error);
    showError('审批失败');
  }
}

// 显示拒绝模态框
function rejectTenant() {
  bootstrap.Modal.getInstance(document.getElementById('approveModal')).hide();
  document.getElementById('rejectReason').value = '';
  
  const modal = new bootstrap.Modal(document.getElementById('rejectModal'));
  modal.show();
}

// 确认拒绝
async function confirmReject() {
  const reason = document.getElementById('rejectReason')?.value || '';
  
  try {
    const response = await fetch(`/api/admin/tenants/${currentTenantId}/reject`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess('已拒绝申请');
      bootstrap.Modal.getInstance(document.getElementById('rejectModal')).hide();
      loadTenants();
      loadPendingCount();
    } else {
      showError(result.message || '拒绝失败');
    }
  } catch (error) {
    console.error('拒绝错误:', error);
    showError('拒绝失败');
  }
}

// 查看租户详情
async function viewTenantDetail(id) {
  try {
    const response = await fetch(`/api/admin/tenants/${id}`);
    const result = await response.json();
    
    if (result.success) {
      const tenant = result.data;
      
      document.getElementById('detailTenantCode').textContent = tenant.tenant_code || '-';
      document.getElementById('detailTenantName').textContent = tenant.name || '-';
      document.getElementById('detailContactPerson').textContent = tenant.contact_person || '-';
      document.getElementById('detailContactPhone').textContent = tenant.contact_phone || '-';
      document.getElementById('detailContactEmail').textContent = tenant.contact_email || '-';
      document.getElementById('detailAddress').textContent = tenant.address || '-';
      
      const statusMap = { 0: '待审批', 1: '启用', 2: '已禁用' };
      document.getElementById('detailStatus').textContent = statusMap[tenant.status] || tenant.status;
      document.getElementById('detailCreatedAt').textContent = formatDate(tenant.created_at);
      document.getElementById('detailUserCount').textContent = tenant.user_count || 0;
      document.getElementById('detailOrderCount').textContent = tenant.order_count || 0;
      
      const modal = new bootstrap.Modal(document.getElementById('tenantDetailModal'));
      modal.show();
    } else {
      showError('加载租户详情失败');
    }
  } catch (error) {
    console.error('加载租户详情错误:', error);
    showError('加载失败');
  }
}

// 切换租户状态
async function toggleTenantStatus(id, status) {
  const action = status === 1 ? '启用' : '禁用';
  
  if (!confirm(`确定要${action}该租户吗？`)) return;
  
  try {
    const response = await fetch(`/api/admin/tenants/${id}/toggle-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess(`${action}成功`);
      loadTenants();
    } else {
      showError(result.message || `${action}失败`);
    }
  } catch (error) {
    console.error(`${action}错误:`, error);
    showError(`${action}失败`);
  }
}

// 删除租户
async function deleteTenant(id) {
  if (!confirm('确定要删除该租户吗？删除后无法恢复！')) return;
  
  try {
    const response = await fetch(`/api/admin/tenants/${id}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess('删除成功');
      loadTenants();
    } else {
      showError(result.message || '删除失败');
    }
  } catch (error) {
    console.error('删除错误:', error);
    showError('删除失败');
  }
}

// 加载待审批数量
async function loadPendingCount() {
  try {
    const response = await fetch('/api/admin/tenants/pending');
    const result = await response.json();
    
    if (result.success) {
      document.getElementById('pendingCount').textContent = result.total || 0;
    }
  } catch (error) {
    console.error('加载待审批数量错误:', error);
  }
}

// 工具函数
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

function showError(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-danger alert-dismissible fade show';
  alertDiv.innerHTML = `
    <i class="fas fa-exclamation-circle me-2"></i>${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.insertBefore(alertDiv, document.body.firstChild);
  setTimeout(() => alertDiv.remove(), 3000);
}

function showSuccess(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-success alert-dismissible fade show';
  alertDiv.innerHTML = `
    <i class="fas fa-check-circle me-2"></i>${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.insertBefore(alertDiv, document.body.firstChild);
  setTimeout(() => alertDiv.remove(), 3000);
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
  // 监听租户页面显示
  const tenantsPage = document.getElementById('tenants');
  if (tenantsPage) {
    const observer = new MutationObserver(function(mutations) {
      if (tenantsPage.classList.contains('active')) {
        loadTenants();
        loadPendingCount();
      }
    });
    
    observer.observe(tenantsPage, { attributes: true, attributeFilter: ['class'] });
  }
});
