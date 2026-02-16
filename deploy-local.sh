#!/bin/bash

# 小蚁搬运本地化测试与灰度部署脚本

set -e  # 遇到错误时退出

echo "🚀 小蚁搬运本地化测试与灰度部署工具"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 函数定义
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE} $1 ${NC}"
    echo -e "${BLUE}================================${NC}"
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
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${PURPLE}➡️  $1${NC}"
}

# 显示菜单
show_menu() {
    echo ""
    echo "请选择操作："
    echo "1) 本地开发环境测试"
    echo "2) 灰度部署测试"
    echo "3) 完整本地测试套件"
    echo "4) 本地开发服务器启动"
    echo "5) 数据库初始化"
    echo "6) 环境检查"
    echo "7) 退出"
    echo ""
    read -p "请输入选项 (1-7): " option
}

# 环境检查函数
check_environment() {
    print_header "环境检查"
    
    # 检查Node.js
    if command -v node &> /dev/null; then
        print_success "Node.js: $(node --version)"
    else
        print_error "Node.js 未安装"
        return 1
    fi
    
    # 检查npm
    if command -v npm &> /dev/null; then
        print_success "npm: $(npm --version)"
    else
        print_error "npm 未安装"
        return 1
    fi
    
    # 检查Git
    if command -v git &> /dev/null; then
        print_success "Git: $(git --version)"
    else
        print_warning "Git 未安装 (可选)"
    fi
    
    # 检查Docker
    if command -v docker &> /dev/null; then
        print_success "Docker: $(docker --version)"
    else
        print_warning "Docker 未安装 (可选)"
    fi
    
    # 检查MySQL
    if command -v mysql &> /dev/null; then
        print_success "MySQL Client: $(mysql --version)"
    else
        print_warning "MySQL Client 未安装"
    fi
    
    return 0
}

# 数据库初始化
initialize_database() {
    print_header "数据库初始化"
    
    # 检查MySQL服务
    if ! brew services list | grep -q "mysql.*started"; then
        print_warning "MySQL 服务未运行，正在启动..."
        brew services start mysql || {
            print_error "无法启动MySQL服务，请手动启动"
            return 1
        }
        sleep 5
    fi
    
    # 检查数据库连接
    if ! mysql -u root -e "SELECT 1" &>/dev/null; then
        print_error "无法连接到MySQL，请检查配置"
        return 1
    fi
    
    # 运行数据库初始化脚本
    print_step "运行数据库初始化脚本..."
    if npm run init-db; then
        print_success "数据库初始化完成"
    else
        print_error "数据库初始化失败"
        return 1
    fi
}

# 本地开发测试
local_development_test() {
    print_header "本地开发环境测试"
    
    # 检查依赖
    if ! check_environment; then
        print_error "环境检查失败"
        return 1
    fi
    
    # 安装依赖
    print_step "安装项目依赖..."
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    if [ ! -d "backend/node_modules" ]; then
        cd backend && npm install && cd ..
    fi
    
    print_success "依赖安装完成"
    
    # 初始化数据库
    initialize_database
    
    # 运行测试
    print_step "运行测试套件..."
    if npm run test; then
        print_success "本地测试通过"
    else
        print_error "本地测试失败"
        return 1
    fi
}

# 灰度部署测试
gray_deploy_test() {
    print_header "灰度部署测试"
    
    print_step "准备灰度部署环境..."
    
    # 创建灰度配置
    cat > .env.gray << EOF
NODE_ENV=gray
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=xiaoyi_banyun_gray
JWT_SECRET=gray_deployment_secret
GRAY_DEPLOY=true
TRAFFIC_PERCENTAGE=10
FEATURE_FLAGS=new_payment:true,enahnced_referral:false
EOF
    
    print_success "灰度配置创建完成"
    
    # 模拟灰度部署
    print_step "模拟灰度部署流程..."
    
    # 1. 构建应用
    print_info "构建应用..."
    npm run build || echo "构建步骤可选"
    
    # 2. 部署到灰度环境
    print_info "部署到灰度环境..."
    # 这里可以添加实际的部署逻辑
    
    # 3. 运行灰度测试
    print_info "运行灰度测试..."
    npm run test-api
    
    print_success "灰度部署测试完成"
    
    # 清理灰度配置
    rm -f .env.gray
}

# 完整测试套件
full_test_suite() {
    print_header "完整测试套件"
    
    # 连行本地开发测试
    if ! local_development_test; then
        print_error "本地开发测试失败，终止完整测试"
        return 1
    fi
    
    # 连行灰度部署测试
    if ! gray_deploy_test; then
        print_error "灰度部署测试失败"
        return 1
    fi
    
    # 运行API测试
    print_step "运行API一致性测试..."
    if node check-api-consistency-simple.js; then
        print_success "API一致性测试通过"
    else
        print_error "API一致性测试失败"
        return 1
    fi
    
    # 运行OpenAPI验证
    print_step "运行OpenAPI规范验证..."
    if node validate-openapi.js; then
        print_success "OpenAPI规范验证通过"
    else
        print_error "OpenAPI规范验证失败"
        return 1
    fi
    
    print_success "完整测试套件通过"
}

# 本地开发服务器启动
start_dev_server() {
    print_header "启动本地开发服务器"
    
    # 检查环境
    if ! check_environment; then
        print_error "环境检查失败"
        return 1
    fi
    
    # 确保依赖已安装
    if [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ]; then
        print_step "安装依赖..."
        npm install
        cd backend && npm install && cd ..
    fi
    
    print_info "启动开发服务器..."
    print_info "服务器将运行在 http://localhost:3000"
    print_info "API文档: http://localhost:3000/api-docs"
    print_info "按 Ctrl+C 停止服务器"
    
    npm run dev
}

# 主循环
while true; do
    show_menu
    
    case $option in
        1)
            print_info "开始本地开发环境测试..."
            local_development_test
            ;;
        2)
            print_info "开始灰度部署测试..."
            gray_deploy_test
            ;;
        3)
            print_info "开始完整测试套件..."
            full_test_suite
            ;;
        4)
            print_info "启动本地开发服务器..."
            start_dev_server
            ;;
        5)
            print_info "初始化数据库..."
            initialize_database
            ;;
        6)
            print_info "检查环境..."
            check_environment
            ;;
        7)
            print_success "再见！"
            exit 0
            ;;
        *)
            print_error "无效选项，请重新选择"
            ;;
    esac
    
    echo ""
    read -p "按 Enter 键继续..."
done