#!/bin/bash

# 小蚁搬运平台重启脚本

echo "🔄 重启小蚁搬运平台..."

# 停止现有服务
echo "🛑 停止现有服务..."
pkill -f "node.*server.js" || echo "⚠️ 未找到后端服务进程"

# 等待停止
sleep 3

# 启动服务
echo "🚀 启动后端服务..."
cd /Users/sunsh80/Downloads/易工到项目/小蚁搬运/backend
npm start &

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 8

# 验证服务
if curl -s -H "x-tenant-code: TEST_TENANT" http://localhost:4000/api/orders > /dev/null; then
    echo "✅ 服务重启成功"
    echo "🌐 服务地址: http://localhost:4000"
    echo "📚 API文档: http://localhost:4000/api-docs"
else
    echo "❌ 服务重启失败"
    exit 1
fi

echo ""
echo "🎉 小蚁搬运平台重启完成！"