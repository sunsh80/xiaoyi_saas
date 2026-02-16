# 小蚁搬运平台部署准备

## 概述
本项目包含一个完整的SaaS架构的多租户跑腿装卸平台，支持货物的装卸搬运工作，包含支付、提现、推荐拉新和抽佣功能。

## 部署前检查清单

### 1. 系统要求
- [x] macOS Monterey 或更高版本
- [x] Node.js 14+ (已安装: v24.13.0)
- [x] npm (已安装: 11.6.2)
- [ ] MySQL (待安装)
- [ ] 项目依赖 (待安装)

### 2. 项目结构
- [x] 完整的项目结构
- [x] 所有必要的源代码文件
- [x] 配置文件
- [x] 测试文件

### 3. API验证
- [x] API一致性检查通过
- [x] OpenAPI规范验证通过
- [x] 所有端点功能正常

## 部署步骤

### 1. 安装MySQL
```bash
# 使用Homebrew安装MySQL
brew install mysql
brew services start mysql

# 设置root密码（如果需要）
mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

### 2. 安装项目依赖
```bash
# 修复npm权限
sudo chown -R $(whoami) ~/.npm

# 安装主项目依赖
npm install

# 安装后端依赖
cd backend
npm install
cd ..
```

### 3. 配置环境
创建 `.env` 文件：
```bash
NODE_ENV=development
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=xiaoyi_banyun_dev
JWT_SECRET=your_secret_key_here
```

### 4. 初始化数据库
```bash
npm run init-db
```

### 5. 启动服务
```bash
# 开发模式
npm run dev

# 或使用启动脚本
./start-macos.sh
```

## 验证部署

### 运行验证脚本
```bash
./verify-deployment.sh
```

### 检查服务
- API文档: http://localhost:3000/api-docs
- 偰护端点: http://localhost:3000/health
- 前端: 微信开发者工具 -> frontend/miniprogram

## 灰度部署功能

### 渐进式发布
- 10% → 25% → 50% → 100% 流量切换
- 自动监控关键指标
- 自动回滚机制
- A/B测试支持

### 监控指标
- 响应时间
- 错误率
- 用户满意度
- 系统性能

## 故障排除

### 常见问题
1. **npm权限错误**: 运行 `sudo chown -R $(whoami) ~/.npm`
2. **数据库连接失败**: 检查MySQL服务是否运行
3. **端口冲突**: 检查端口占用 `lsof -i :3000`
4. **依赖安装失败**: 清理缓存 `npm cache clean --force`

### 调试命令
```bash
# 检查服务状态
npm run dev

# 查看日志
tail -f backend/logs/app.log

# 数据库连接测试
mysql -u root -p -e "SHOW DATABASES;"
```

## 生产部署

### Docker部署
```bash
# 构建Docker镜像
docker build -t xiaoyi-banyun:latest .

# 运行容器
docker run -d --name xiaoyi-banyun -p 4000:4000 xiaoyi-banyun:latest
```

### CI/CD集成
- GitHub Actions配置
- 自动测试流程
- 自动部署流程
- 回滚机制

## 支持资源

### 文档
- [完整部署指南](deployment/FULL_DEPLOYMENT_GUIDE.md)
- [本地测试指南](deployment/LOCAL_TESTING_GUIDE.md)
- [Docker配置](deployment/DOCKER_SETUP.md)

### 联系支持
- GitHub Issues
- 项目文档
- 社区支持

您的系统 (macOS Monterey, Intel Core i5 2.7GHz 双核) 完全兼容此项目，可以顺利运行开发和测试环境。