# 小蚁搬运本地化测试与灰度部署完整指南

## 目录
1. [本地开发环境搭建](#本地开发环境搭建)
2. [本地测试流程](#本地测试流程)
3. [灰度部署策略](#灰度部署策略)
4. [生产环境部署](#生产环境部署)
5. [监控与回滚](#监控与回滚)
6. [故障排除](#故障排除)

## 本地开发环境搭建

### 1. 系统要求
- **操作系统**: macOS Monterey (您的系统)
- **处理器**: Intel Core i5 2.7GHz (双核) - 完全兼容
- **内存**: 8GB+ RAM (推荐 16GB)
- **存储**: 2GB+ 可用空间
- **软件**: Node.js 14+, MySQL 8.0.31+, Docker (可选)

### 2. 安装依赖

#### 2.1 安装 Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 2.2 安装 Node.js
```bash
brew install node
```

#### 2.3 安装和配置 MySQL
如果您已经安装了 MySQL Workbench，通常 MySQL 服务器也已经安装。请按以下步骤操作：

##### 2.3.1 启动 MySQL 服务
```bash
# 如果您使用 MySQL Workbench：
# 1. 打开 MySQL Workbench
# 2. 点击菜单 Server -> Start Server
#
# 或者通过系统偏好设置启动 MySQL 服务：
# 1. 打开系统偏好设置
# 2. 找到 MySQL 图标并点击
# 3. 点击 "Start MySQL Server" 按钮
```

##### 2.3.2 配置数据库连接
```bash
# 如果您使用 MySQL Workbench，需要确保以下配置正确：
# 1. 打开 MySQL Workbench
# 2. 点击 "Local Instance 3306" 或类似的连接
# 3. 输入 root 用户的密码
# 4. 确认服务器正在运行且端口为 3306
```

#### 2.4 安装 Docker (可选，用于容器化开发)
```bash
# 下载 Docker Desktop for Mac
# https://www.docker.com/products/docker-desktop
```

### 3. 项目初始化

#### 3.1 克隆项目
```bash
cd /Users/sunsh80/Downloads/易工到项目/
git clone <repository-url>
cd xiaoyi-banyun
```

#### 3.2 安装依赖
```bash
# 主项目依赖
npm install

# 后端依赖
cd backend
npm install
cd ..

# 开发工具
npm install -g nodemon concurrently
```

#### 3.3 环境配置
创建 `.env.local` 文件：
```bash
NODE_ENV=development
PORT=3000
BACKEND_PORT=3000  # 后端服务端口，优先级高于PORT

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Ssh19800219
DB_NAME=xiaoyi_banyun_dev

# JWT配置
JWT_SECRET=local_dev_secret_key

# 其他配置
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
LOG_LEVEL=debug
```

### 4. 数据库初始化
```bash
# 确保 MySQL 服务正在运行后，执行：
npm run init-db
```

如果遇到数据库连接错误，请确认：
1. MySQL 服务已在 MySQL Workbench 或系统偏好设置中启动
2. backend/.env 文件中的数据库配置正确
3. MySQL 用户具有适当的权限

### 5. 创建测试用户
```bash
# 确保数据库初始化完成后，创建测试用户（包括管理员和工人账户）
node create-test-users.js
```

测试账户信息：
- **管理员账户**: `test_admin` / `password123` (角色: 租户管理员, 手机号: 13800138001)
- **工人账户**: `test_worker` / `password123` (角色: 工人, 手机号: 13800138002)
- **普通用户账户**: `dev_user` / `password123` (角色: 租户用户, 手机号: 13900139001)
- **开发管理员账户**: `dev_admin` / `password123` (角色: 租户管理员, 手机号: 13900139002)

注意：如果在创建测试用户时遇到数据库连接错误，请确保 MySQL 服务正在运行且数据库配置正确。

## 本地测试流程

### 1. 运行测试套件
```bash
# 完整测试
npm run test

# 单项测试
npm run test-connectivity    # 连通性测试
npm run test-login         # 登录流程测试
npm run test-api          # API功能测试
```

### 2. 本地开发服务器
```bash
# 启动开发服务器
npm run dev

# 或使用启动脚本
./start-macos.sh
```

### 3. 创建和测试用户
```bash
# 创建测试用户（如果尚未创建）
node create-test-users.js

# 测试登录功能
node test-login.js
```

### 4. 手动登录测试
使用以下测试账户进行登录验证：

#### 4.1 管理员账户
```bash
# 使用默认端口4000（可通过BACKEND_PORT环境变量修改）
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "x-tenant-code: TEST_TENANT" \
  -d '{"username": "test_admin", "password": "password123"}'
```

#### 4.2 工人账户
```bash
# 使用默认端口4000（可通过BACKEND_PORT环境变量修改）
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "x-tenant-code: TEST_TENANT" \
  -d '{"username": "test_worker", "password": "password123"}'
```

成功登录后，您将收到包含用户信息和JWT令牌的响应，可用于后续API调用的身份验证。

### 7. API测试
```bash
# API文档 (默认端口4000，可通过BACKEND_PORT环境变量修改)
http://localhost:4000/api-docs

# 偰护检查
curl http://localhost:4000/health

# 认证测试
curl -H "x-tenant-code: test_tenant" http://localhost:4000/api/auth/me
```

### 8. 小程序测试
- 打开微信开发者工具
- 项目路径: `frontend/miniprogram`
- AppID: 使用测试号或体验版

## 灰度部署策略

### 1. 灰度发布准备

#### 1.1 创建灰度分支
```bash
git checkout -b gray-release-v1.0
```

#### 1.2 灰度配置
创建 `config/gray-deploy.js`:
```javascript
module.exports = {
  grayDeploy: {
    version: 'v1.0-gray',
    trafficPercentage: 10, // 10%流量
    userRules: {
      userIdRange: { start: 1000, end: 1050 },
      tenantIds: ['gray_tenant_001', 'gray_tenant_002'],
      geoLocations: ['北京', '上海', '深圳']
    },
    featureFlags: {
      newPaymentMethod: true,
      enhancedReferral: true,
      advancedAnalytics: false
    },
    monitoring: {
      metrics: ['response_time', 'error_rate', 'user_satisfaction'],
      alerts: {
        responseTime: '>2000ms',
        errorRate: '>5%'
      }
    }
  }
};
```

### 2. 灰度发布流程

#### 2.1 构建灰度版本
```bash
# 设置灰度环境变量
export NODE_ENV=gray
export GRAY_VERSION=v1.0-gray

# 构建应用
npm run build
```

#### 2.2 部署到灰度环境
```bash
# 使用Docker部署
docker build -t xiaoyi-banyun:gray-v1.0 .
docker run -d --name xiaoyi-banyun-gray \
  -p 3001:3000 \
  -e NODE_ENV=gray \
  -e DB_HOST=gray-db \
  xiaoyi-banyun:gray-v1.0
```

#### 2.3 流量切换策略
```bash
# 渐进式流量切换
# 1. 5% 流量 -> 灰度环境 (5分钟观察)
# 2. 10% 流量 -> 灰度环境 (10分钟观察)
# 3. 25% 流量 -> 灰度环境 (15分钟观察)
# 4. 50% 流量 -> 灰度环境 (30分钟观察)
# 5. 100% 流量 -> 灰度环境 (60分钟观察)
```

### 3. 灰度监控

#### 3.1 关键指标监控
```bash
# 响应时间监控
curl -w "@curl-format.txt" -o /dev/null -s "http://gray.xiaoyibanyun.com/api/health"

# 错误率监控
tail -f /var/log/app.log | grep ERROR

# 性能监控
npm run test-api -- --monitor
```

#### 3.2 自动告警
```javascript
// 监控脚本示例
const monitor = {
  checkHealth: async () => {
    const response = await fetch('http://gray.xiaoyibanyun.com/health');
    if (response.status !== 200) {
      sendAlert('Gray deployment health check failed');
    }
  },
  
  checkPerformance: async () => {
    const start = Date.now();
    await fetch('http://gray.xiaoyibanyun.com/api/orders');
    const duration = Date.now() - start;
    
    if (duration > 2000) { // 超过2秒
      sendAlert(`High response time: ${duration}ms`);
    }
  }
};
```

## 生产环境部署

### 1. 生产环境配置

#### 1.1 生产环境变量
```bash
# .env.production
NODE_ENV=production
PORT=3000

# 数据库
DB_HOST=prod-mysql.cluster.region.rds.amazonaws.com
DB_PORT=3306
DB_USER=prod_user
DB_PASSWORD=secure_password
DB_NAME=xiaoyi_banyun_prod

# JWT
JWT_SECRET=production_jwt_secret_key

# 安全
ALLOWED_ORIGINS=https://xiaoyibanyun.com,https://www.xiaoyibanyun.com
TRUST_PROXY=true

# 性能
MAX_CONNECTIONS=100
POOL_MIN=10
POOL_MAX=50
```

### 2. CI/CD 配置

#### 2.1 GitHub Actions 示例
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
        
    - name: Install dependencies
      run: |
        npm ci
        
    - name: Run tests
      run: npm test
      
    - name: Build
      run: npm run build
      
    - name: Deploy to production
      run: |
        # 部署逻辑
        echo "Deploying to production..."
```

## 监控与回滚

### 1. 监控系统

#### 1.1 应用监控
```javascript
// 监控中间件
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: duration,
      ip: req.ip
    };
    
    // 记录到监控系统
    monitor.logRequest(log);
    
    // 检查性能阈值
    if (duration > 2000) {
      monitor.alertSlowResponse(log);
    }
  });
  
  next();
});
```

#### 1.2 偰护端点
```javascript
// 偰护检查端点
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'ok',
    service: 'xiaoyi-banyun',
    version: process.env.npm_package_version,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: Object.keys(require('http').globalAgent.sockets).length
  };
  
  // 检查数据库连接
  try {
    // 数据库连接检查
    healthCheck.database = 'connected';
  } catch (err) {
    healthCheck.database = 'disconnected';
    healthCheck.status = 'error';
  }
  
  res.status(healthCheck.status === 'ok' ? 200 : 503).json(healthCheck);
});
```

### 2. 自动回滚机制

#### 2.1 回滚条件
```javascript
const rollbackConditions = {
  errorRate: 0.05,    // 错误率 > 5%
  responseTime: 2000, // 响应时间 > 2秒
  availability: 0.95, // 可用性 < 95%
  cpuUsage: 0.85,     // CPU使用率 > 85%
  memoryUsage: 0.90   // 内存使用率 > 90%
};
```

#### 2.2 回滚脚本
```bash
#!/bin/bash
# rollback.sh

# 检查是否需要回滚
check_rollback_needed() {
  # 检查错误率
  error_rate=$(curl -s http://localhost:3000/metrics | jq '.errorRate')
  if (( $(echo "$error_rate > 0.05" | bc -l) )); then
    echo "Error rate too high: $error_rate"
    return 0
  fi
  
  # 检查响应时间
  response_time=$(curl -s -w "%{time_total}" -o /dev/null http://localhost:3000/health)
  if (( $(echo "$response_time > 2.0" | bc -l) )); then
    echo "Response time too high: $response_time"
    return 0
  fi
  
  return 1
}

# 执行回滚
perform_rollback() {
  echo "🔄 执行回滚..."
  
  # 停止当前版本
  docker stop xiaoyi-banyun-current
  
  # 启动上一个稳定版本
  docker run -d --name xiaoyi-banyun-current \
    -p 4000:4000 \
    xiaoyi-banyun:stable-latest
  
  echo "✅ 回滚完成"
}
```

## 故障排除

### 1. 常见问题

#### 1.1 端口冲突
```bash
# 检查端口占用
lsof -i :3000

# 杀死占用进程
kill -9 $(lsof -t -i:3000)
```

#### 1.2 数据库连接问题
```bash
# 如果您使用 MySQL Workbench：
# 1. 打开 MySQL Workbench
# 2. 检查连接是否处于活动状态
# 3. 点击 Server -> Status 查看服务器状态

# 如果需要重启MySQL服务：
# 通过 MySQL Workbench:
# 1. 点击 Server -> Stop Server
# 2. 然后点击 Server -> Start Server
#
# 或者通过系统偏好设置:
# 1. 打开系统偏好设置
# 2. 点击 MySQL 图标
# 3. 点击 "Stop MySQL Server" 然后 "Start MySQL Server"

# 测试连接
# 如果安装了命令行工具:
mysql -u root -p

# 或者在 MySQL Workbench 中:
# 1. 点击 "+" 创建新连接
# 2. 使用 localhost:3306 连接
# 3. 用户名 root，输入密码
```

#### 1.3 依赖安装问题
```bash
# 清理缓存
npm cache clean --force

# 重新安装
rm -rf node_modules package-lock.json
npm install
```

#### 1.4 用户模型连接池问题
如果遇到 `connection.release is not a function` 错误，请确保 User.js 模型正确使用连接池：

```javascript
// 在 User.js 模型中，确保使用以下模式：
static async findById(userId, tenantCode) {
  const pool = getTenantConnection(tenantCode);  // 获取连接池
  const connection = await pool.getConnection(); // 从池中获取连接
  try {
    // 执行数据库操作
    const [rows] = await connection.execute(/* ... */);
    return rows.length > 0 ? new User(rows[0]) : null;
  } finally {
    connection.release(); // 释放连接回池
  }
}
```

#### 1.5 租户中间件模块导出问题
如果遇到 `getTenantConnection is not a function` 错误，请确保 tenant.js 正确导出函数：

```javascript
// backend/middleware/tenant.js
// 导出中间件函数和连接函数
module.exports = tenantMiddleware;
module.exports.getTenantConnection = getTenantConnection;
```

### 2. 调试技巧

#### 2.1 启用详细日志
```bash
# 设置日志级别
export LOG_LEVEL=debug

# 启动应用
npm run dev
```

#### 2.2 数据库调试
```sql
-- 检查数据库连接
SHOW PROCESSLIST;

-- 检查表结构
DESCRIBE orders;

-- 检查数据
SELECT COUNT(*) FROM users;
```

### 3. 性能优化

#### 3.1 数据库优化
```sql
-- 添加索引
CREATE INDEX idx_orders_status_created ON orders(status, created_at);
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);
```

#### 3.2 缓存策略
```javascript
// Redis缓存示例
const cache = {
  get: async (key) => {
    return await redis.get(key);
  },
  
  set: async (key, value, ttl = 3600) => {
    await redis.setex(key, ttl, JSON.stringify(value));
  }
};
```

## 部署脚本

### 1. 一键部署脚本
```bash
#!/bin/bash
# deploy.sh

echo "🚀 开始部署小蚁搬运平台..."

# 检查环境
echo "🔍 检查环境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

# 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 安装依赖
echo "📦 安装依赖..."
npm install
cd backend && npm install && cd ..

# 构建应用
echo "🔨 构建应用..."
npm run build

# 数据库迁移
echo "🗄️  数据库迁移..."
npm run migrate

# 初始化测试用户（可选）
echo "👥 创建测试用户..."
node create-test-users.js

# 重启服务
echo "🔄 重启服务..."
pm2 restart xiaoyi-banyun || pm2 start ecosystem.config.js

echo "✅ 部署完成！"
echo "应用查看: http://localhost:4000 (或您配置的BACKEND_PORT端口)"
echo "🧪 测试账户: test_admin / password123"
echo "(worker账户: test_worker / password123)"
```

### 2. 数据库健康检查与修复脚本
我们还提供了一个自动化脚本来检查和修复常见的数据库连接问题：

```bash
# 运行数据库健康检查和修复
./scripts/fix-db-connection.sh
```

该脚本会自动执行以下操作：
1. 检查MySQL服务是否运行
2. 检查数据库连接是否正常
3. 验证数据库和关键表是否存在
4. 如有问题则自动修复
5. 重启后端服务以应用修复

此外，还有一个Node.js版本的健康检查脚本：
```bash
# 运行Node.js版本的数据库健康检查
node scripts/db-health-check.js
```

### 2. PM2 配置
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'xiaoyi-banyun',
    script: './backend/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      BACKEND_PORT: 4000  // 优先使用 BACKEND_PORT
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 4000,
      BACKEND_PORT: 4000  // 优先使用 BACKEND_PORT
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

## 补充说明

### 测试用户管理
系统预置了四个测试用户，方便进行不同角色的功能测试：
- `test_admin` (租户管理员, 手机号: 13800138001) - 用于测试管理功能
- `test_worker` (工人, 手机号: 13800138002) - 用于测试工人端功能
- `dev_user` (租户用户, 手机号: 13900139001) - 用于测试普通用户功能
- `dev_admin` (开发管理员, 手机号: 13900139002) - 用于开发环境管理

### 常见问题修复
1. **数据库连接问题**：确保 MySQL 服务已启动且配置正确（通过 MySQL Workbench 或系统偏好设置）
2. **用户模型连接池问题**：确保 User.js 模型正确使用连接池获取和释放连接
3. **租户中间件导出问题**：确保 tenant.js 正确导出 getTenantConnection 函数
4. **登录失败问题**：检查租户代码和用户状态是否正确
5. **MySQL Workbench 连接问题**：确认 MySQL Workbench 中的连接设置与项目配置一致
6. **数据库连接释放问题**：在模型中使用 `const pool = getTenantConnection(...)` 获取连接池，然后使用 `const connection = await pool.getConnection()` 获取连接，并在 finally 块中调用 `connection.release()` 释放连接

### 端口配置
- 默认后端端口: 4000 (可通过 BACKEND_PORT 环境变量修改)
- 环境变量优先级: BACKEND_PORT > PORT > 默认值 4000

### 安全建议
- 在生产环境中使用强密码替换默认密码
- 定期轮换 JWT 密钥
- 限制数据库访问权限
- 启用 HTTPS 加密传输

这个完整的本地化测试与灰度部署方案涵盖了从小规模本地开发到大规模生产部署的所有关键环节，特别针对您的macOS系统进行了优化配置。