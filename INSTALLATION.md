# 小蚁搬运平台安装和运行指南

## 系统要求

- **操作系统**: macOS Monterey 或更高版本
- **处理器**: Intel Core i5 2.7GHz 或更高 (您的系统完全兼容)
- **内存**: 8GB RAM (推荐 16GB)
- **存储**: 至少 2GB 可用空间
- **软件**: Node.js, MySQL

## 安装步骤

### 1. 安装系统依赖

#### 安装 Homebrew (包管理器)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 安装 Xcode 命令行工具
```bash
xcode-select --install
```

#### 安装 Node.js
```bash
brew install node
```

#### 验证 Node.js 安装
```bash
node --version  # 应该显示 v14.x 或更高版本
npm --version   # 应该显示 6.x 或更高版本
```

#### 安装 MySQL
```bash
brew install mysql
brew services start mysql
```

### 2. 配置项目

#### 克隆项目 (如果尚未克隆)
```bash
cd /Users/sunsh80/Downloads/易工到项目/
# 如果是从版本控制克隆:
# git clone <repository-url>
# cd xiaoyi-banyun
```

#### 安装项目依赖
```bash
cd /Users/sunsh80/Downloads/易工到项目/小蚁搬运

# 安装主项目依赖
npm install

# 安装后端依赖
cd backend
npm install
cd ..

# 安装开发工具依赖
npm install -g nodemon concurrently
```

### 3. 配置数据库

#### 创建数据库配置文件
在项目根目录创建 `.env` 文件：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=xiaoyi_banyun

# JWT配置
JWT_SECRET=your_super_secret_jwt_key_here

# 服务器配置
PORT=3000
NODE_ENV=development

# 允许的来源
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

#### 初始化数据库
```bash
# 运行数据库初始化脚本
npm run init-db
```

### 4. 启动服务

#### 方法1: 使用npm脚本 (推荐)
```bash
# 同时启动前端和后端 (开发模式)
npm run dev
```

#### 方法2: 分别启动

##### 启动后端服务
```bash
cd /Users/sunsh80/Downloads/易工到项目/小蚁搬运/backend
npm run dev  # 开发模式 (自动重启)
# 或
npm start    # 生产模式
```

后端服务将运行在 `http://localhost:4000` (默认端口，可通过BACKEND_PORT环境变量修改)

##### 启动前端小程序
前端是微信小程序，需要使用微信开发者工具：

1. 打开微信开发者工具
2. 选择 "新建项目"
3. 项目路径选择: `/Users/sunsh80/Downloads/易工到项目/小蚁搬运/frontend/miniprogram`
4. AppID选择 "体验版" 或申请正式AppID

### 5. 验证安装

#### 检查后端服务
```bash
curl http://localhost:4000/api/health  # 默认端口，如果是其他端口请替换
```

#### 运行API测试
```bash
# 运行完整测试套件
npm run test

# 或运行单个测试
npm run test-connectivity    # 连通性测试
npm run test-login          # 登录流程测试
npm run test-api            # 完整API测试
```

### 6. 管理后台

管理后台可以通过浏览器访问：
- API文档: `http://localhost:4000/api-docs` (默认端口，可通过BACKEND_PORT环境变量修改)
- 后端服务: `http://localhost:4000/api/` (默认端口，可通过BACKEND_PORT环境变量修改)

## 开发模式 vs 生产模式

### 开发模式
```bash
npm run dev  # 自动重启，详细日志
```

### 生产模式
```bash
npm start    # 稳定运行，优化性能
```

## 常见问题解决

### 1. MySQL连接问题
```bash
# 检查MySQL服务状态
brew services list | grep mysql

# 重启MySQL服务
brew services restart mysql

# 设置root密码
mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_new_password';
FLUSH PRIVILEGES;
```

### 2. 端口占用问题
```bash
# 检查端口占用
lsof -i :3000

# 杀死占用端口的进程
kill -9 <PID>
```

### 3. npm权限问题
```bash
# 修复npm权限
sudo chown -R $(whoami) ~/.npm
# 或使用npx避免全局安装
npx nodemon server.js
```

### 4. 依赖安装缓慢
```bash
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com
npm install
```

## 性能优化 (针对您的系统)

由于您的系统是双核i5，建议：

1. **关闭不必要的应用程序**以释放内存
2. **使用轻量级编辑器**如 VS Code
3. **合理配置数据库连接池** (在配置文件中设置较小的连接数)
4. **开发时只启动必要的服务**

## 项目结构

```
小蚁搬运/
├── backend/              # 后端服务
│   ├── models/           # 数据模型
│   ├── routes/           # API路由
│   ├── controllers/      # 控制器
│   ├── middleware/       # 中间件
│   ├── config/           # 配置文件
│   └── server.js         # 服务启动文件
├── frontend/             # 前端小程序
│   └── miniprogram/      # 微信小程序代码
├── admin/                # 管理后台
├── docs/                 # 文档
├── test/                 # 测试文件
├── openapi.yaml          # API规范
├── package.json          # 项目配置
└── README.md             # 项目说明
```

## 后续步骤

1. **配置微信小程序AppID** (如果需要发布)
2. **配置生产环境的数据库** (生产环境使用)
3. **设置反向代理** (如使用Nginx)
4. **配置SSL证书** (生产环境推荐)

## 获取帮助

- 查看API文档: `http://localhost:3000/api-docs`
- 运行测试: `npm run test`
- 检查日志: 查看终端输出
- 社区支持: [GitHub Issues](https://github.com/your-repo/issues)

您的系统完全兼容该项目，可以顺利运行开发和测试环境！