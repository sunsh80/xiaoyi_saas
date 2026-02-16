#!/bin/bash

# 小蚁搬运平台快速启动脚本
# 适用于 macOS 系统

echo "🚀 小蚁搬运平台快速启动脚本"
echo "=============================="

# 检查Node.js是否已安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    echo "请先安装Node.js: https://nodejs.org/"
    exit 1
fi

# 检查npm是否已安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    echo "请先安装npm"
    exit 1
fi

# 检查MySQL是否运行
if ! brew services list | grep -q "mysql.*started"; then
    echo "⚠️  MySQL 服务未运行，正在启动..."
    brew services start mysql
    sleep 3
fi

# 检查MySQL连接
if ! mysql -u root -e "SELECT 1" &>/dev/null; then
    echo "❌ 无法连接到MySQL，请检查MySQL配置"
    echo "可能需要设置MySQL root密码:"
    echo "  mysql -u root -p"
    echo "  ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';"
    exit 1
fi

echo "✅ 环境检查通过"

# 检查并安装依赖
echo "📦 检查项目依赖..."
if [ ! -d "node_modules" ]; then
    echo "安装主项目依赖..."
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "安装后端依赖..."
    cd backend
    npm install
    cd ..
fi

# 初始化数据库
echo "🗄️  初始化数据库..."
npm run init-db

# 启动服务
echo "🌟 启动小蚁搬运平台..."
echo "后端服务将运行在 http://localhost:4000 (默认端口，可通过BACKEND_PORT环境变量修改)"
echo "API文档: http://localhost:4000/api-docs (默认端口，可通过BACKEND_PORT环境变量修改)"
echo ""
echo "前端请在微信开发者工具中打开: frontend/miniprogram"
echo ""
echo "按 Ctrl+C 停止服务"
echo "=============================="

# 启动开发服务器
npm run dev