#!/bin/bash

# 小蚁搬运平台停止脚本

echo "🛑 停止小蚁搬运平台服务..."

# 停止后端服务
echo "🔌 停止后端服务..."
pkill -f "node.*server.js" || echo "⚠️ 未找到后端服务进程"

echo "✅ 服务已停止"