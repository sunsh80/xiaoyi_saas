# 小蚁搬运平台 - 测试用户创建指南

## 步骤 1: 安装 MySQL

```bash
# 使用 Homebrew 安装 MySQL
brew install mysql

# 启动 MySQL 服务
brew services start mysql
```

## 步骤 2: 初始化数据库

```bash
# 进入项目目录
cd /Users/sunsh80/Downloads/易工到项目/小蚁搬运

# 初始化数据库（创建表结构和基本配置）
node init-db.js
```

## 步骤 3: 创建测试用户

```bash
# 创建两个主要的测试登录账户（以及其他辅助账户）
node create-test-users.js
```

## 测试账户信息

创建的测试账户包括：

### 账户 1: 管理员账户
- 用户名: `test_admin`
- 密码: `password123`
- 角色: `admin`
- 手机号: `13800138001`
- 租户: `TEST_TENANT`

### 账户 2: 工人账户
- 用户名: `test_worker`
- 密码: `password123`
- 角色: `worker`
- 手机号: `13800138002`
- 租户: `TEST_TENANT`

### 其他辅助账户
- `dev_user` (租户用户)
- `dev_admin` (开发管理员)

## 登录方式

可以通过以下方式登录测试：

1. 使用用户名和密码登录
2. 使用手机号和密码登录

## 故障排除

如果遇到数据库连接问题：

1. 确认 MySQL 服务正在运行：
   ```bash
   brew services list | grep mysql
   ```

2. 如果服务未运行，启动它：
   ```bash
   brew services start mysql
   ```

3. 检查数据库配置文件：
   - `/Users/sunsh80/Downloads/易工到项目/小蚁搬运/backend/.env`

4. 如果需要，可以手动设置 MySQL root 密码：
   ```bash
   mysql -u root -p
   # 然后执行:
   # ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
   ```