# 总后台租户审批功能使用说明

## 更新日期：2026-02-17

## 一、已完成的功能

### 1. 后端 API

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/admin/tenants` | GET | 获取租户列表（支持筛选、分页） |
| `/api/admin/tenants/pending` | GET | 获取待审批租户列表 |
| `/api/admin/tenants/:id` | GET | 获取租户详情 |
| `/api/admin/tenants/:id/approve` | PUT | 审批通过租户 |
| `/api/admin/tenants/:id/reject` | PUT | 审批拒绝租户 |
| `/api/admin/tenants/:id` | PUT | 更新租户信息 |
| `/api/admin/tenants/:id` | DELETE | 删除租户 |
| `/api/admin/tenants/:id/toggle-status` | PUT | 启用/禁用租户 |

### 2. 前端组件

**文件位置**: 
- `admin/assets/js/tenant-manager.js` - 租户管理 JavaScript
- `admin/tenant-manager.html` - 租户管理 HTML 组件（含模态框）

**功能**:
- ✅ 租户列表展示（支持状态筛选、搜索）
- ✅ 待审批租户数量显示
- ✅ 租户详情查看
- ✅ 租户审批通过（支持自定义租户编码）
- ✅ 租户审批拒绝（可填写拒绝原因）
- ✅ 租户启用/禁用
- ✅ 租户删除
- ✅ 分页功能

## 二、使用方法

### 1. 手动更新 admin/index.html

由于 admin/index.html 文件较大，需要手动替换租户管理页面部分。

#### 步骤 1: 替换租户管理页面 HTML

找到 `admin/index.html` 中的 `<!-- 租户管理页面 -->` 部分（约第 728-805 行），替换为：

```html
<!-- 租户管理页面 -->
<div id="tenants" class="page">
  <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2">租户管理</h1>
    <div class="btn-toolbar mb-2 mb-md-0">
      <button type="button" class="btn btn-sm btn-primary">
        <i class="fas fa-plus me-1"></i>新增租户
      </button>
      <button type="button" class="btn btn-sm btn-warning ms-2" onclick="showPendingTenants()">
        <i class="fas fa-clock me-1"></i>待审批 <span class="badge bg-white text-warning" id="pendingCount">0</span>
      </button>
    </div>
  </div>

  <!-- 筛选器 -->
  <div class="card mb-3">
    <div class="card-body">
      <div class="row">
        <div class="col-md-3 mb-2">
          <label class="form-label">状态筛选</label>
          <select class="form-select" id="tenantStatusFilter" onchange="loadTenants()">
            <option value="">全部</option>
            <option value="1">启用</option>
            <option value="0">待审批</option>
            <option value="2">已禁用</option>
          </select>
        </div>
        <div class="col-md-3 mb-2">
          <label class="form-label">搜索</label>
          <input type="text" class="form-control" id="tenantSearch" placeholder="租户名称/联系人/电话">
        </div>
        <div class="col-md-2 mb-2">
          <label class="form-label">&nbsp;</label>
          <button class="btn btn-primary w-100" onclick="loadTenants()">
            <i class="fas fa-search me-1"></i>查询
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 租户列表 -->
  <div class="card">
    <div class="card-body">
      <div class="table-responsive">
        <table class="table table-striped table-hover">
          <thead>
            <tr>
              <th>租户编码</th>
              <th>租户名称</th>
              <th>联系人</th>
              <th>联系电话</th>
              <th>邮箱</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="tenantsTableBody">
            <tr>
              <td colspan="8" class="text-center text-muted">
                <i class="fas fa-spinner fa-spin"></i> 加载中...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- 分页 -->
  <nav aria-label="租户分页">
    <ul class="pagination justify-content-center" id="tenantsPagination"></ul>
  </nav>
</div>
```

#### 步骤 2: 添加模态框

在 `admin/index.html` 的 `</body>` 标签之前，添加三个模态框（租户详情、审批、拒绝原因）。

查看 `admin/tenant-manager.html` 文件，复制其中的模态框代码到 `admin/index.html`。

#### 步骤 3: 引入 JavaScript

在 `admin/index.html` 的最后，找到引入 JavaScript 的地方，添加：

```html
<script src="/assets/js/tenant-manager.js"></script>
```

### 2. 测试流程

#### 2.1 创建测试租户注册

1. 打开小程序，进入登录页
2. 点击"立即注册"
3. 选择"我是租户"
4. 填写租户注册信息
5. 提交注册

#### 2.2 总后台审批

1. 访问 http://localhost:4000/admin/login.html 登录总后台
2. 点击左侧导航"租户管理"
3. 点击"待审批"按钮，查看待审批租户
4. 点击"审批"按钮
5. 可选择自定义租户编码
6. 点击"通过"或"拒绝"

#### 2.3 验证审批结果

1. 租户审批通过后，状态变为"启用"
2. 租户管理员可以登录租户管理后台
3. 访问 http://localhost:4000/tenant-admin/login.html

## 三、租户编码说明

### 3.1 自动生成规则

- **格式**: `TN + YYYYMMDD + 4 位随机数`
- **示例**: `TN202602171234`

### 3.2 自定义编码

总后台审批时可以自定义租户编码：
- 留空：使用系统自动生成的编码
- 填写：使用自定义编码（需确保唯一性）

### 3.3 编码用途

租户编码用于：
1. 租户管理员登录时指定租户
2. API 请求头 `x-tenant-code` 传递
3. 数据隔离标识

## 四、状态说明

### 租户状态

| 状态码 | 状态名称 | 说明 |
|-------|---------|------|
| 0 | 待审批 | 刚注册，等待总后台审批 |
| 1 | 启用 | 审批通过，可正常使用 |
| 2 | 已禁用 | 审批拒绝或违规禁用 |

### 用户状态

| 状态码 | 状态名称 | 说明 |
|-------|---------|------|
| 0 | 待激活 | 租户待审批，用户不可用 |
| 1 | 已激活 | 可正常登录使用 |
| 2 | 已禁用 | 账户被禁用 |

## 五、注意事项

1. **数据库连接**: 租户管理使用全局连接（`global`），确保数据库配置正确
2. **事务处理**: 审批操作使用事务，确保数据一致性
3. **权限控制**: 租户管理 API 需要总后台管理员权限
4. **删除限制**: 如果租户下有订单，不允许删除
5. **软删除**: 拒绝的租户设置为 status=2，不物理删除

## 六、后续优化建议

1. **短信通知**: 审批结果通过短信通知租户
2. **邮件通知**: 发送审批结果邮件
3. **批量审批**: 支持批量审批多个租户
4. **审批历史**: 记录审批操作日志
5. **导出功能**: 导出租户列表为 Excel
6. **数据统计**: 租户数量统计图表
