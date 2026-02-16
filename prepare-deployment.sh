#!/bin/bash

# 小蚁搬运部署准备脚本

echo "🔧 小蚁搬运部署准备"
echo "=================="

# 检查是否以root权限运行此脚本
if [ "$EUID" -eq 0 ]; then
    echo "❌ 请不要以root权限运行此脚本"
    exit 1
fi

echo "1. 修复npm缓存权限..."
sudo chown -R $(whoami) ~/.npm

if [ $? -ne 0 ]; then
    echo "❌ npm缓存权限修复失败"
    exit 1
fi

echo "✅ npm缓存权限修复完成"

echo "2. 安装项目依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 主项目依赖安装失败"
    exit 1
fi

echo "✅ 主项目依赖安装完成"

echo "3. 安装后端依赖..."
cd backend
npm install
cd ..

if [ $? -ne 0 ]; then
    echo "❌ 后端依赖安装失败"
    exit 1
fi

echo "✅ 后端依赖安装完成"

echo "4. 初始化数据库..."
npm run init-db

if [ $? -ne 0 ]; then
    echo "❌ 数据库初始化失败"
    exit 1
fi

echo "✅ 数据库初始化完成"

echo "5. 验证安装..."
./verify-deployment.sh

echo ""
echo "🎉 部署准备完成！"
echo ""
echo "下一步操作："
echo "1. 启动开发服务器: npm run dev"
echo "2. 运行完整测试: npm run test"
echo "3. 查看API文档: http://localhost:3000/api-docs"