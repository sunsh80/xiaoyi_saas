# 小蚁搬运项目依赖分析报告

## 项目概述
小蚁搬运是一个SaaS架构的多租户跑腿装卸平台，包含后端服务、前端小程序和管理后台。

## 系统要求
- 操作系统: macOS Monterey 或更高版本
- CPU: Intel Core i5 (2.7 GHz 双核) 或更高
- 内存: 8GB RAM (推荐 16GB)
- 存储: 至少 2GB 可用空间

## 核心依赖项

### 1. Node.js 运行时环境
- **版本要求**: Node.js 14.x 或更高版本
- **用途**: 运行后端服务和构建工具
- **兼容性**: 与您的Intel Mac完全兼容

### 2. MySQL 数据库
- **版本要求**: MySQL 5.7 或更高版本
- **用途**: 存储用户、订单、财务等所有业务数据
- **兼容性**: 与您的系统完全兼容

### 3. 微信开发者工具
- **用途**: 开发和调试前端小程序
- **兼容性**: 有Intel Mac版本可用

## 项目依赖树

### 主项目依赖 (package.json)
```
dependencies:
├── express (^4.18.2)           # Web框架
├── mysql2 (^3.6.0)            # MySQL驱动
├── bcryptjs (^2.4.3)          # 密码加密
├── jsonwebtoken (^9.0.2)      # JWT认证
├── cors (^2.8.5)              # 跨域处理
├── helmet (^7.0.0)            # 安全中间件
├── express-rate-limit (^6.10.0) # 限流中间件
├── dotenv (^16.3.1)           # 环境变量管理
├── swagger-jsdoc (^6.2.8)     # API文档生成
└── swagger-ui-express (^5.0.0) # API文档界面

devDependencies:
├── concurrently (^8.2.0)      # 并行执行命令
├── nodemon (^3.0.1)           # 开发时自动重启
└── @apidevtools/swagger-cli (^4.0.4) # Swagger CLI工具
```

### 后端依赖 (backend/package.json)
```
dependencies:
├── express (^4.18.2)           # Web框架
├── mysql2 (^3.6.0)            # MySQL驱动
├── bcryptjs (^2.4.3)          # 密码加密
├── jsonwebtoken (^9.0.2)      # JWT认证
├── cors (^2.8.5)              # 跨域处理
├── helmet (^7.0.0)            # 安全中间件
├── express-rate-limit (^6.10.0) # 限流中间件
└── dotenv (^16.3.1)           # 环境变量管理

devDependencies:
├── nodemon (^3.0.1)           # 开发时自动重启
└── jest (^29.6.2)             # 测试框架
```

## 安装指南

### 1. 安装Node.js
推荐使用Homebrew安装:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node
```

### 2. 安装MySQL
```bash
brew install mysql
brew services start mysql
```

### 3. 安装项目依赖
```bash
# 在项目根目录
npm install

# 在后端目录
cd backend
npm install
```

## 性能考虑 (针对您的系统)

### 您的系统规格:
- **CPU**: 2.7 GHz 双核 Intel Core i5
- **内存**: 8GB (推测，如不足建议升级到16GB)
- **操作系统**: macOS Monterey

### 优化建议:

1. **内存管理**:
   - 您的双核CPU适合开发环境
   - 建议关闭不必要的应用程序以释放内存
   - 如果运行多个服务（数据库+后端+前端），建议至少8GB内存

2. **开发环境优化**:
   - 使用nodemon进行开发时热重载
   - 在生产环境中使用PM2进行进程管理
   - 合理配置数据库连接池大小

3. **数据库优化**:
   - MySQL配置文件调整以适应您的硬件
   - 适当减少并发连接数

## 兼容性评估

### ✅ 完全兼容
- Node.js (所有依赖包)
- MySQL
- Express框架
- 前端小程序开发

### ⚠️ 需要注意
- 某些原生编译的npm包可能需要Xcode命令行工具
- 长时间高负载运行时注意散热

## 安装步骤

1. **安装Xcode命令行工具**:
```bash
xcode-select --install
```

2. **安装Node.js**:
```bash
# 使用Homebrew
brew install node

# 验证安装
node --version
npm --version
```

3. **安装MySQL**:
```bash
brew install mysql
brew services start mysql

# 设置MySQL root密码
mysql_secure_installation
```

4. **克隆并安装项目**:
```bash
cd /path/to/your/projects
git clone <repository-url>
cd xiaoyi-banyun

# 安装依赖
npm install

# 后端依赖
cd backend
npm install
cd ..

# 初始化数据库
npm run init-db
```

5. **配置环境变量**:
创建 `.env` 文件配置数据库连接等信息

## 故障排除

### 常见问题:
1. **npm安装缓慢**: 使用淘宝镜像
```bash
npm config set registry https://registry.npmmirror.com
```

2. **权限问题**: 确保有适当的文件权限
```bash
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

3. **MySQL连接问题**: 检查MySQL服务是否运行
```bash
brew services list | grep mysql
```

## 总结

您的MacBook Pro (2.7 GHz 双核Intel Core i5) 完全可以运行小蚁搬运项目，适合开发和测试环境。虽然性能不是顶级，但对于开发工作完全够用。建议在运行时关闭不必要的应用程序以获得最佳性能。