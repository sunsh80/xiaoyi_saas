#!/bin/bash

# 小蚁搬运平台一键启动脚本

echo "🚀 启动小蚁搬运平台..."

# 启动后端服务
echo "🔌 启动后端服务..."
cd /Users/sunsh80/Downloads/易工到项目/小蚁搬运/backend
npm start &
BACKEND_PID=$!

# 等待后端服务启动
echo "⏳ 等待后端服务启动..."
sleep 8

# 验证后端服务
if curl -s -H "x-tenant-code: TEST_TENANT" http://localhost:4000/api/orders > /dev/null; then
    echo "✅ 后端服务启动成功"
    echo "🌐 API服务地址: http://localhost:4000"
    echo "📚 API文档地址: http://localhost:4000/api-docs"
else
    echo "❌ 后端服务启动失败"
    exit 1
fi

echo ""
echo "🎉 小蚁搬运平台启动完成！"
echo ""
echo "📋 服务信息:"
echo "- 后端服务: http://localhost:4000"
echo "- API文档: http://localhost:4000/api-docs"
echo "- 测试账户:"
echo "  * 管理员: test_admin / password123"
echo "  * 工人: test_worker / password123"
echo "  * 普通用户: dev_user / password123"
echo "  * 开发管理员: dev_admin / password123"
echo ""
echo "💡 提示: 前端小程序请在微信开发者工具中打开 /Users/sunsh80/Downloads/易工到项目/小蚁搬运/frontend/miniprogram 目录"
echo ""
echo "mPid: $BACKEND_PID"
echo "如需停止服务，请运行: kill $BACKEND_PID"