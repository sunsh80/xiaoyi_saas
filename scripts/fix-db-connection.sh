#!/bin/bash
# 小蚁搬运自动化数据库修复脚本

set -e  # 遇到错误时退出

echo "🏥 小蚁搬运数据库健康检查与修复工具"
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

# 检查MySQL服务状态
check_mysql_service() {
    print_step "检查MySQL服务状态..."

    # 检查是否安装了brew
    if command -v brew &> /dev/null; then
        # 检查MySQL服务是否正在运行
        if brew services list | grep -q "mysql.*started"; then
            print_success "MySQL 服务正在运行"
            return 0
        else
            print_warning "MySQL 服务未运行"
            return 1
        fi
    else
        # 如果没有brew，尝试直接检查MySQL进程
        if pgrep mysqld > /dev/null; then
            print_success "MySQL 服务正在运行"
            return 0
        else
            print_warning "MySQL 服务未运行"
            return 1
        fi
    fi
}

# 启动MySQL服务
start_mysql_service() {
    print_step "启动MySQL服务..."

    if command -v brew &> /dev/null; then
        if brew services start mysql; then
            print_success "MySQL 服务启动成功"
            sleep 5  # 等待服务完全启动
            return 0
        else
            print_error "无法启动MySQL服务"
            return 1
        fi
    else
        print_error "未找到brew，无法自动启动MySQL服务"
        print_info "请手动启动MySQL服务"
        return 1
    fi
}

# 检查数据库连接
check_db_connection() {
    print_step "检查数据库连接..."

    # 从backend/.env文件读取配置
    if [ -f "backend/.env" ]; then
        source backend/.env
    fi

    # 设置默认值
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-3306}
    DB_USER=${DB_USER:-xiaoyi_app}
    DB_PASSWORD=${DB_PASSWORD:-xiaoyi_pass_2023}
    DB_NAME=${DB_NAME:-XIAOYI}

    # 尝试连接数据库
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" &>/dev/null; then
        print_success "数据库连接成功"
        
        # 检查数据库是否存在
        if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME;" &>/dev/null; then
            print_success "数据库 $DB_NAME 存在"
            
            # 检查关键表是否存在
            tables=("users" "orders" "referral_campaigns" "referrals" "referral_rewards" "tenants")
            for table in "${tables[@]}"; do
                if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -D "$DB_NAME" -e "SELECT 1 FROM $table LIMIT 1;" &>/dev/null; then
                    print_success "表 $table 存在且可访问"
                else
                    print_warning "表 $table 不存在或无法访问"
                fi
            done
            
            return 0
        else
            print_warning "数据库 $DB_NAME 不存在"
            return 1
        fi
    else
        print_error "数据库连接失败"
        return 1
    fi
}

# 初始化数据库
initialize_database() {
    print_step "初始化数据库..."

    if npm run init-db; then
        print_success "数据库初始化完成"
        return 0
    else
        print_error "数据库初始化失败"
        return 1
    fi
}

# 修复数据库连接问题
fix_database_issues() {
    print_header "修复数据库连接问题"

    # 1. 检查MySQL服务
    if ! check_mysql_service; then
        print_info "尝试启动MySQL服务..."
        if ! start_mysql_service; then
            print_error "无法启动MySQL服务，请手动启动"
            return 1
        fi
    fi

    # 2. 检查数据库连接
    if ! check_db_connection; then
        print_info "数据库连接失败，尝试初始化数据库..."
        if ! initialize_database; then
            print_error "数据库初始化失败"
            return 1
        fi
        
        # 重新检查连接
        if ! check_db_connection; then
            print_error "初始化后仍无法连接数据库"
            return 1
        fi
    fi

    print_success "数据库问题修复完成"
    return 0
}

# 重启后端服务
restart_backend() {
    print_step "重启后端服务..."

    # 终止现有进程
    pkill -f "node.*server.js" || true
    sleep 3

    # 启动后端服务
    cd backend && npm start &
    cd ..

    # 等待服务启动
    sleep 8

    # 检查服务是否启动成功
    if curl -s -o /dev/null -w "%{http_code}" -H "x-tenant-code: TEST_TENANT" http://localhost:4000/api/health &>/dev/null; then
        print_success "后端服务重启成功"
        return 0
    else
        print_error "后端服务重启失败"
        return 1
    fi
}

# 主流程
main() {
    print_header "小蚁搬运数据库修复工具"

    # 检查当前目录
    if [ ! -f "package.json" ]; then
        print_error "未在项目根目录，请切换到项目根目录后再运行此脚本"
        exit 1
    fi

    print_info "开始修复数据库连接问题..."
    
    if fix_database_issues; then
        print_success "数据库问题修复成功"
        
        print_info "重启后端服务..."
        if restart_backend; then
            print_success "所有修复操作完成！"
            echo ""
            echo "测试账户信息："
            echo "- 管理员账户: test_admin / password123"
            echo "- 工人账户: test_worker / password123"
            echo "- 普通用户账户: dev_user / password123"
            echo "- 开发管理员账户: dev_admin / password123"
            echo ""
            echo "服务地址: http://localhost:4000"
            echo "API文档: http://localhost:4000/api-docs"
        else
            print_error "后端服务重启失败"
            exit 1
        fi
    else
        print_error "数据库修复失败"
        exit 1
    fi
}

# 运行主流程
main "$@"