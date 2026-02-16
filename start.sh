#!/bin/bash

# 小蚁搬运平台启动脚本
# 自动验证API一致性并启动服务

echo "🚀 启动小蚁搬运SaaS平台..."

# 检查Node.js是否已安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装Node.js"
    exit 1
fi

# 检查npm是否已安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装npm"
    exit 1
fi

echo "✅ Node.js 和 npm 检查通过"

# 验证OpenAPI规范
echo "🔍 验证OpenAPI规范..."
if command -v npx &> /dev/null; then
    npx @apidevtools/swagger-cli validate openapi.yaml
    if [ $? -eq 0 ]; then
        echo "✅ OpenAPI规范验证通过"
    else
        echo "⚠️ OpenAPI规范存在问题，但继续启动服务"
    fi
else
    echo "⚠️ npx不可用，跳过OpenAPI验证"
fi

# 检查后端依赖
BACKEND_DIR="./backend"
if [ -d "$BACKEND_DIR" ]; then
    echo "📦 检查后端依赖..."
    cd $BACKEND_DIR
    
    # 检查node_modules是否存在
    if [ ! -d "node_modules" ]; then
        echo "📦 安装后端依赖..."
        npm install --no-save swagger-jsdoc swagger-ui-express
    else
        # 安装缺失的swagger相关依赖
        npm install --no-save swagger-jsdoc swagger-ui-express
    fi
    
    echo "✅ 后端依赖检查完成"
    cd ..
else
    echo "⚠️ 后端目录不存在"
fi

# 启动后端服务
echo "🔌 启动后端服务..."
cd $BACKEND_DIR
PORT=${PORT:-3000}
echo "📡 服务将在端口 $PORT 上启动"
node server.js &
BACKEND_PID=$!

# 返回主目录
cd ..

echo "🎉 小蚁搬运平台已启动!"
echo "🌐 后端API: http://localhost:$PORT"
echo "📄 API文档: http://localhost:$PORT/api-docs"
echo "📱 微信小程序: 请在微信开发者工具中打开 ./frontend/miniprogram 目录"
echo ""
echo "🔧 要停止服务，请运行: kill $BACKEND_PID"

# 等待后端进程结束
wait $BACKEND_PID