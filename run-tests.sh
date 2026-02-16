#!/bin/bash

# 小蚁搬运API测试套件运行脚本

echo "🚀 开始运行小蚁搬运API测试套件..."
echo "========================================="
echo ""

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
echo ""

# 设置测试环境
export NODE_ENV=test
export API_BASE_URL=${API_BASE_URL:-http://localhost:3000/api}
export TEST_TENANT_CODE=${TEST_TENANT_CODE:-test_tenant}

echo "🌐 API基地址: $API_BASE_URL"
echo "🏢 租户代码: $TEST_TENANT_CODE"
echo ""

# 创建测试结果目录
mkdir -p test-results

echo "🧪 开始运行连通性测试..."
echo "----------------------------------------"
node test/connectivity-test.js 2>&1 | tee test-results/connectivity-result.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ 连通性测试完成"
else
    echo "❌ 连通性测试失败，但这不会阻止后续测试"
fi

echo ""
echo "🔐 开始运行登录流程测试..."
echo "----------------------------------------"
node test/login-flow-test.js 2>&1 | tee test-results/login-result.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ 登录流程测试完成"
else
    echo "❌ 登录流程测试失败，但这不会阻止后续测试"
fi

echo ""
echo "🔍 开始运行完整API测试套件..."
echo "----------------------------------------"
node test/api-test-suite.js 2>&1 | tee test-results/api-result.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ 完整API测试套件完成"
else
    echo "❌ 完整API测试套件失败"
fi

echo ""
echo "📊 生成测试报告..."
echo "----------------------------------------"
node test/report-generator.js

echo ""
echo "📈 测试结果摘要:"
echo "----------------------------------------"
CONNECTIVITY_RESULT=$(grep -c "✅" test-results/connectivity-result.log || echo 0)
LOGIN_RESULT=$(grep -c "✅" test-results/login-result.log || echo 0)
API_RESULT=$(grep -c "✅" test-results/api-result.log || echo 0)

echo "连通性测试: $CONNECTIVITY_RESULT 个✅标记"
echo "登录流程测试: $LOGIN_RESULT 个✅标记" 
echo "API套件测试: $API_RESULT 个✅标记"

echo ""
echo "📁 测试结果文件已保存至 test-results/ 目录"
echo "📄 HTML报告已生成至 test-report.html"

echo ""
echo "🎉 小蚁搬运API测试套件运行完成！"
echo "========================================="
echo "请查看 test-report.html 获取详细测试报告"