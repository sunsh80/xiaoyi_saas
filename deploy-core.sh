#!/bin/bash

# 小蚁搬运平台精简版部署脚本

echo "🚀 部署小蚁搬运平台精简版..."

# 进入项目目录
cd /Users/sunsh80/Downloads/易工到项目/小蚁搬运-精简版

# 安装主项目依赖
echo "📦 安装主项目依赖..."
npm install --no-audit --no-fund

# 进入后端目录并安装依赖
echo "📦 安装后端依赖..."
cd backend
npm install --no-audit --no-fund

# 返回主目录
cd ..

echo "✅ 依赖安装完成！"

echo "📋 精简版项目结构："
ls -la

echo "📋 后端目录结构："
ls -la backend/

echo "💡 使用说明："
echo "1. 配置环境变量: cp backend/.env.example backend/.env"
echo "2. 编辑 backend/.env 文件配置数据库连接"
echo "3. 初始化数据库: node init-db.js"
echo "4. 启动服务: npm start 或 cd backend && node server.js"