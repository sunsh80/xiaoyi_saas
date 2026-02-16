#!/bin/bash

# 小蚁搬运快速部署验证脚本

set -e

echo "🔍 小蚁搬运本地部署验证"
echo "======================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}====================${NC}"
    echo -e "${BLUE} $1 ${NC}"
    echo -e "${BLUE}====================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 1. 检查系统依赖
print_header "系统依赖检查"

dependencies=(
    "node --version"
    "npm --version" 
    "mysql --version"
    "git --version"
    "docker --version"
)

for dep in "${dependencies[@]}"; do
    cmd=$(echo $dep | cut -d' ' -f1)
    if command -v $cmd &> /dev/null; then
        version=$($dep 2>/dev/null | head -n1)
        print_success "$cmd: $version"
    else
        print_warning "$cmd: 未安装 (可选)"
    fi
done

# 2. 检查项目结构
print_header "项目结构检查"

required_dirs=("backend" "frontend" "docs" "test")
required_files=("package.json" "backend/package.json" "openapi.yaml")

for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        print_success "目录存在: $dir/"
    else
        print_error "目录缺失: $dir/"
    fi
done

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "文件存在: $file"
    else
        print_error "文件缺失: $file"
    fi
done

# 3. 检查依赖安装
print_header "依赖检查"

if [ -d "node_modules" ]; then
    print_success "主项目依赖已安装"
else
    print_warning "主项目依赖未安装，需要运行: npm install"
fi

if [ -d "backend/node_modules" ]; then
    print_success "后端依赖已安装"
else
    print_warning "后端依赖未安装，需要运行: cd backend && npm install"
fi

# 4. 检查环境配置
print_header "环境配置检查"

if [ -f ".env" ] || [ -f ".env.local" ]; then
    print_success "环境配置文件存在"
else
    print_warning "环境配置文件缺失，建议创建 .env 文件"
fi

# 5. 检查数据库连接
print_header "数据库连接检查"

if command -v mysql &> /dev/null; then
    if mysql -u root -e "SELECT 1" &>/dev/null; then
        print_success "MySQL 连接正常"
    else
        print_warning "MySQL 连接失败"
    fi
else
    print_warning "MySQL 客户端未安装"
fi

# 6. 检查API端点
print_header "API端点检查"

if curl -s --connect-timeout 5 http://localhost:3000/health &>/dev/null; then
    print_success "后端服务运行正常"
    print_info "API文档: http://localhost:3000/api-docs"
else
    print_warning "后端服务未运行"
    print_info "启动服务: npm run dev"
fi

# 7. 运行快速测试
print_header "运行快速测试"

if npm run test-connectivity &>/dev/null; then
    print_success "连通性测试通过"
else
    print_warning "连通性测试失败"
fi

if npm run test-login &>/dev/null; then
    print_success "登录流程测试通过"
else
    print_warning "登录流程测试失败"
fi

# 8. 检查API一致性
print_header "API一致性检查"

if node check-api-consistency-simple.js &>/dev/null; then
    print_success "API一致性检查通过"
else
    print_warning "API一致性检查失败"
fi

# 9. 检查OpenAPI规范
print_header "OpenAPI规范检查"

if node validate-openapi.js &>/dev/null; then
    print_success "OpenAPI规范验证通过"
else
    print_warning "OpenAPI规范验证失败"
fi

# 10. 生成验证报告
print_header "验证结果摘要"

total_checks=10
pass_count=0

if command -v node &> /dev/null; then ((pass_count++)); fi
if [ -d "node_modules" ]; then ((pass_count++)); fi
if [ -f "package.json" ]; then ((pass_count++)); fi
if [ -f ".env" ] || [ -f ".env.local" ]; then ((pass_count++)); fi
if command -v mysql &> /dev/null && mysql -u root -e "SELECT 1" &>/dev/null; then ((pass_count++)); fi
if curl -s --connect-timeout 5 http://localhost:3000/health &>/dev/null; then ((pass_count++)); fi
if npm run test-connectivity &>/dev/null; then ((pass_count++)); fi
if npm run test-login &>/dev/null; then ((pass_count++)); fi
if node check-api-consistency-simple.js &>/dev/null; then ((pass_count++)); fi
if node validate-openapi.js &>/dev/null; then ((pass_count++)); fi

echo ""
echo "📊 验证结果: $pass_count/$total_checks 项通过"
percentage=$((pass_count * 100 / total_checks))
echo "📈 通过率: $percentage%"

if [ $percentage -ge 80 ]; then
    print_success "🎉 部署准备就绪！"
    echo ""
    echo "下一步操作："
    echo "1. 启动开发服务器: npm run dev"
    echo "2. 运行完整测试: npm run test"
    echo "3. 访问API文档: http://localhost:3000/api-docs"
    echo "4. 前端开发: 微信开发者工具 -> frontend/miniprogram"
elif [ $percentage -ge 50 ]; then
    print_warning "⚠️  部署基本就绪，但需要解决部分问题"
    echo ""
    echo "建议操作："
    echo "1. 安装缺失的依赖"
    echo "2. 配置环境变量"
    echo "3. 启动数据库服务"
    echo "4. 运行 npm install"
else
    print_error "❌ 部署准备不足，请解决上述问题"
    echo ""
    echo "必需操作："
    echo "1. 安装 Node.js 和 npm"
    echo "2. 安装 MySQL"
    echo "3. 安装项目依赖: npm install"
    echo "4. 配置数据库连接"
fi

echo ""
echo "📖 详细部署指南: deployment/FULL_DEPLOYMENT_GUIDE.md"
echo "🔧 本地测试指南: deployment/LOCAL_TESTING_GUIDE.md"
echo "🐳 Docker配置: deployment/DOCKER_SETUP.md"