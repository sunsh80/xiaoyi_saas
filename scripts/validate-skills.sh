#!/bin/bash
# ============================================================
# 小蚁搬运 SaaS 平台 — Skills 规范校验脚本
# 用途：自动化检查代码是否符合 .qoder/roules/skills.md 规范
# 用法：./scripts/validate-skills.sh [--fix] [--quiet]
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 统计变量
ERRORS=0
WARNINGS=0
PASSED=0

# 项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 参数解析
QUIET=false
FIX=false
for arg in "$@"; do
  case $arg in
    --quiet) QUIET=true ;;
    --fix) FIX=true ;;
    --help)
      echo "用法: $0 [--fix] [--quiet]"
      echo "  --fix    自动修复部分问题"
      echo "  --quiet  只输出错误和统计"
      exit 0
      ;;
  esac
done

# 输出函数
log_pass() {
  ((PASSED++))
  if [ "$QUIET" = false ]; then
    echo -e "${GREEN}✓${NC} $1"
  fi
}

log_warn() {
  ((WARNINGS++))
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  ((ERRORS++))
  echo -e "${RED}✗${NC} $1"
}

log_section() {
  if [ "$QUIET" = false ]; then
    echo ""
    echo -e "${BLUE}━━━ $1 ━━━${NC}"
  fi
}

# ============================================================
# 1. OpenAPI 规范检查
# ============================================================
log_section "1. OpenAPI 规范检查"

# 1.1 检查 openapi/ 目录结构
if [ -d "$PROJECT_ROOT/openapi" ]; then
  log_pass "openapi/ 目录存在"
else
  log_error "openapi/ 目录不存在"
fi

if [ -f "$PROJECT_ROOT/openapi/openapi.yaml" ]; then
  log_pass "openapi/openapi.yaml 主入口存在"
else
  log_error "openapi/openapi.yaml 主入口不存在"
fi

# 1.2 检查 openapi/openapi.yaml 中是否有内联路径定义（应该只有 $ref）
if [ -f "$PROJECT_ROOT/openapi/openapi.yaml" ]; then
  # 检查 paths: 下是否有直接的路径定义（非 $ref 引用行）
  # 正确格式：/auth/register:\n    $ref: '...'
  # 错误格式：/auth/register:\n    post:\n      summary: ...
  INLINE_PATHS=0
  in_paths=false
  while IFS= read -r line; do
    if [[ "$line" =~ ^paths: ]]; then
      in_paths=true
      continue
    fi
    if [ "$in_paths" = true ]; then
      # 遇到下一个顶级键（非缩进）则退出 paths 块
      if [[ "$line" =~ ^[a-z] ]]; then
        break
      fi
      # 检查是否有方法定义（post:/get:/put:/delete:）直接跟在路径下
      if [[ "$line" =~ ^\s{4}(post|get|put|delete|patch): ]]; then
        ((INLINE_PATHS++))
      fi
    fi
  done < "$PROJECT_ROOT/openapi/openapi.yaml"

  if [ "$INLINE_PATHS" -eq 0 ]; then
    log_pass "openapi/openapi.yaml 中无内联路径定义（全部使用 \$ref）"
  else
    log_error "openapi/openapi.yaml 中发现 $INLINE_PATHS 个内联路径定义（应全部使用 \$ref）"
  fi
fi

# 1.3 检查路径文件命名规范（全小写+短横线）
if [ -d "$PROJECT_ROOT/openapi/paths" ]; then
  INVALID_NAMES=$(find "$PROJECT_ROOT/openapi/paths" -name "*.yaml" | while read f; do
    basename "$f" | grep -qE '^[a-z][a-z0-9-]*\.yaml$' || echo "$(basename "$f")"
  done)
  if [ -z "$INVALID_NAMES" ]; then
    log_pass "路径文件命名规范（全小写+短横线）"
  else
    log_error "路径文件命名不规范: $INVALID_NAMES"
  fi
fi

# 1.4 检查 Schema 文件命名规范
if [ -d "$PROJECT_ROOT/openapi/components/schemas" ]; then
  INVALID_SCHEMA_NAMES=$(find "$PROJECT_ROOT/openapi/components/schemas" -name "*.yaml" | while read f; do
    basename "$f" | grep -qE '^[a-z][a-z0-9-]*\.yaml$' || echo "$(basename "$f")"
  done)
  if [ -z "$INVALID_SCHEMA_NAMES" ]; then
    log_pass "Schema 文件命名规范（全小写+短横线）"
  else
    log_error "Schema 文件命名不规范: $INVALID_SCHEMA_NAMES"
  fi
fi

# 1.5 检查路径文件中的 $ref 是否使用相对路径
if [ -d "$PROJECT_ROOT/openapi/paths" ]; then
  # 检查是否有错误的绝对路径引用（如 $ref: '/components/...' 或 $ref: '#/components/...'）
  # 正确格式：$ref: '../components/schemas/xxx.yaml#/Xxx'
  BAD_REFS=$(grep -rE "\\\$ref:\s*['\"](#|/)" "$PROJECT_ROOT/openapi/paths/" 2>/dev/null | wc -l)
  if [ "$BAD_REFS" -eq 0 ]; then
    log_pass "路径文件中 \$ref 使用相对路径（../components/schemas/）"
  else
    log_error "路径文件中发现 $BAD_REFS 个错误路径 \$ref（应使用 ../components/schemas/）"
  fi
fi

# 1.6 检查骨架端点是否有 TODO 注释
if [ -d "$PROJECT_ROOT/openapi/paths" ]; then
  SKELETON_WITHOUT_TODO=$(grep -l "TODO: 待补充完整定义" "$PROJECT_ROOT/openapi/paths/"*.yaml 2>/dev/null | wc -l)
  SKELETON_ENDPOINTS=$(grep -l "# TODO: 待补充" "$PROJECT_ROOT/openapi/paths/"*.yaml 2>/dev/null | wc -l)
  if [ "$SKELETON_ENDPOINTS" -gt 0 ]; then
    log_pass "骨架端点标注了 TODO 注释（$SKELETON_ENDPOINTS 个文件）"
  fi
fi

# 1.7 检查旧版 openapi.yaml 是否已备份
if [ -f "$PROJECT_ROOT/openapi.yaml" ] && [ -f "$PROJECT_ROOT/openapi.legacy.yaml" ]; then
  log_pass "旧版 openapi.yaml 已备份为 openapi.legacy.yaml"
elif [ -f "$PROJECT_ROOT/openapi.yaml" ] && [ ! -f "$PROJECT_ROOT/openapi.legacy.yaml" ]; then
  log_warn "旧版 openapi.yaml 存在但未备份"
fi

# ============================================================
# 2. 后端代码规范检查
# ============================================================
log_section "2. 后端代码规范检查"

# 2.1 检查 Controller 是否有 try/catch
if [ -d "$PROJECT_ROOT/backend/controllers" ]; then
  CONTROLLERS_WITHOUT_TRY=$(find "$PROJECT_ROOT/backend/controllers" -name "*Controller.js" | while read f; do
    if ! grep -q "try {" "$f"; then
      echo "$(basename "$f")"
    fi
  done)
  if [ -z "$CONTROLLERS_WITHOUT_TRY" ]; then
    log_pass "所有 Controller 方法包含 try/catch"
  else
    log_error "Controller 缺少 try/catch: $CONTROLLERS_WITHOUT_TRY"
  fi
fi

# 2.2 检查 Model 是否使用 getTenantConnection
if [ -d "$PROJECT_ROOT/backend/models" ]; then
  MODELS_WITHOUT_TENANT=$(find "$PROJECT_ROOT/backend/models" -name "*.js" | while read f; do
    # 排除 index.js 和配置类文件
    if [[ "$(basename "$f")" == "index.js" ]]; then continue; fi
    if grep -q "static async" "$f" && ! grep -q "getTenantConnection" "$f"; then
      echo "$(basename "$f")"
    fi
  done)
  if [ -z "$MODELS_WITHOUT_TENANT" ]; then
    log_pass "Model 使用 getTenantConnection 获取数据库连接"
  else
    log_warn "Model 可能未使用 getTenantConnection: $MODELS_WITHOUT_TENANT"
  fi
fi

# 2.3 检查是否有直接 mysql.createConnection
if [ -d "$PROJECT_ROOT/backend" ]; then
  # 排除临时脚本文件（如 check-*.js, fix-*.js 等）
  DIRECT_CONN=$(grep -r "mysql\.createConnection\|mysql2\.createConnection" "$PROJECT_ROOT/backend" --include="*.js" 2>/dev/null | grep -v node_modules | grep -v "config/database.js" | grep -vE "(check-|fix-|temp-|debug)" | wc -l)
  if [ "$DIRECT_CONN" -eq 0 ]; then
    log_pass "无直接 mysql.createConnection 调用"
  else
    log_error "发现 $DIRECT_CONN 处直接 mysql.createConnection 调用（应使用 getTenantConnection）"
    if [ "$QUIET" = false ]; then
      grep -r "mysql\.createConnection\|mysql2\.createConnection" "$PROJECT_ROOT/backend" --include="*.js" 2>/dev/null | grep -v node_modules | grep -v "config/database.js" | grep -vE "(check-|fix-|temp-|debug)"
    fi
  fi
fi

# 2.4 检查是否有字符串拼接 SQL
if [ -d "$PROJECT_ROOT/backend" ]; then
  SQL_INJECTION=$(grep -rE "execute\(\s*['\"]\s*\+\s*|execute\(\s*\`\s*.*\\\$\{" "$PROJECT_ROOT/backend" --include="*.js" 2>/dev/null | grep -v node_modules | wc -l)
  if [ "$SQL_INJECTION" -eq 0 ]; then
    log_pass "无字符串拼接 SQL（使用参数化查询）"
  else
    log_error "发现 $SQL_INJECTION 处字符串拼接 SQL（必须使用参数化查询 ?）"
  fi
fi

# 2.5 检查连接是否在 finally 中 release
if [ -d "$PROJECT_ROOT/backend/models" ]; then
  NO_RELEASE=$(find "$PROJECT_ROOT/backend/models" -name "*.js" | while read f; do
    if grep -q "getConnection()" "$f" && ! grep -q "finally" "$f"; then
      echo "$(basename "$f")"
    fi
  done)
  if [ -z "$NO_RELEASE" ]; then
    log_pass "数据库连接在 finally 中 release"
  else
    log_error "Model 获取连接后未在 finally 中 release: $NO_RELEASE"
  fi
fi

# 2.6 检查 Controller 错误日志格式
if [ -d "$PROJECT_ROOT/backend/controllers" ]; then
  BAD_LOG=$(find "$PROJECT_ROOT/backend/controllers" -name "*Controller.js" | while read f; do
    if grep -q "console.error" "$f"; then
      if ! grep -qE "console\.error\(['\"][A-Za-z]+Controller\.[a-zA-Z]+ error:" "$f"; then
        echo "$(basename "$f")"
      fi
    fi
  done)
  if [ -z "$BAD_LOG" ]; then
    log_pass "Controller 错误日志格式正确（ControllerName.methodName error:）"
  else
    log_warn "Controller 错误日志格式不规范: $BAD_LOG"
  fi
fi

# ============================================================
# 3. 文件规范检查
# ============================================================
log_section "3. 文件规范检查"

# 3.1 检查根目录是否有散落的脚本文件
ROOT_SCRIPTS=$(find "$PROJECT_ROOT" -maxdepth 1 -name "*.js" -o -name "*.sh" 2>/dev/null | grep -v "package.json" | wc -l)
if [ "$ROOT_SCRIPTS" -eq 0 ]; then
  log_pass "根目录无散落的脚本文件"
else
  log_warn "根目录发现 $ROOT_SCRIPTS 个脚本文件（建议移至 scripts/）"
fi

# 3.2 检查 .env 是否被 git 跟踪
if [ -d "$PROJECT_ROOT/.git" ]; then
  ENV_TRACKED=$(cd "$PROJECT_ROOT" && git ls-files .env 2>/dev/null | wc -l)
  if [ "$ENV_TRACKED" -eq 0 ]; then
    log_pass ".env 未被 git 跟踪（正确）"
  else
    log_error ".env 被 git 跟踪（必须从版本控制中移除）"
  fi
fi

# 3.3 检查是否有调试文件
DEBUG_FILES=$(find "$PROJECT_ROOT" -name "server_debug*.js" -o -name "temp_*.js" -o -name "*.backup" -o -name "*.bak" 2>/dev/null | grep -v node_modules | wc -l)
if [ "$DEBUG_FILES" -eq 0 ]; then
  log_pass "无调试/备份文件"
else
  log_warn "发现 $DEBUG_FILES 个调试/备份文件"
fi

# 3.4 检查 node_modules 是否被 git 跟踪
if [ -d "$PROJECT_ROOT/.git" ]; then
  NM_TRACKED=$(cd "$PROJECT_ROOT" && git ls-files node_modules 2>/dev/null | head -1 | wc -l)
  if [ "$NM_TRACKED" -eq 0 ]; then
    log_pass "node_modules 未被 git 跟踪（正确）"
  else
    log_error "node_modules 被 git 跟踪（必须从版本控制中移除）"
  fi
fi

# ============================================================
# 4. 数据库规范检查
# ============================================================
log_section "4. 数据库规范检查"

# 4.1 检查 schema.sql 是否存在
if [ -f "$PROJECT_ROOT/docs/database/schema.sql" ]; then
  log_pass "docs/database/schema.sql 存在"
else
  log_warn "docs/database/schema.sql 不存在"
fi

# 4.2 检查新表是否同步到 openapi（简单检查）
if [ -f "$PROJECT_ROOT/docs/database/schema.sql" ] && [ -d "$PROJECT_ROOT/openapi/components/schemas" ]; then
  # 提取 schema.sql 中的表名
  TABLES=$(grep -oE "CREATE TABLE.*\`?([a-z_]+)\`?" "$PROJECT_ROOT/docs/database/schema.sql" 2>/dev/null | sed 's/CREATE TABLE.*`\{0,1\}//' | sed 's/`\{0,1\}.*//' | sort -u)
  if [ -n "$TABLES" ]; then
    log_pass "schema.sql 中发现表定义（需人工确认是否同步到 openapi）"
  fi
fi

# ============================================================
# 5. 管理后台规范检查
# ============================================================
log_section "5. 管理后台规范检查"

# 5.1 检查总后台入口文件
if [ -f "$PROJECT_ROOT/admin/index.html" ]; then
  log_pass "admin/index.html 入口文件存在"
else
  log_warn "admin/index.html 入口文件不存在"
fi

# 5.2 检查租户后台入口文件
if [ -f "$PROJECT_ROOT/tenant-admin/index.html" ]; then
  log_pass "tenant-admin/index.html 入口文件存在"
else
  log_warn "tenant-admin/index.html 入口文件不存在"
fi

# ============================================================
# 6. Skills 文档一致性检查
# ============================================================
log_section "6. Skills 文档一致性检查"

# 6.1 检查 skills.md 是否存在
if [ -f "$PROJECT_ROOT/.qoder/roules/skills.md" ]; then
  log_pass ".qoder/roules/skills.md 存在"
else
  log_error ".qoder/roules/skills.md 不存在"
fi

# 6.2 检查 skills.md 版本信息
if [ -f "$PROJECT_ROOT/.qoder/roules/skills.md" ]; then
  if grep -q "版本.*v2" "$PROJECT_ROOT/.qoder/roules/skills.md"; then
    log_pass "skills.md 版本信息为 v2.x"
  else
    log_warn "skills.md 版本信息可能过时"
  fi
fi

# ============================================================
# 自动修复函数
# ============================================================
fix_issues() {
  echo ""
  echo -e "${BLUE}━━━ 自动修复 ━━━${NC}"

  # 1. 清理调试/备份文件
  echo "清理调试/备份文件..."
  find "$PROJECT_ROOT" -name "server_debug*.js" -delete 2>/dev/null
  find "$PROJECT_ROOT" -name "temp_*.js" -delete 2>/dev/null
  find "$PROJECT_ROOT" -name "*.backup" -delete 2>/dev/null
  find "$PROJECT_ROOT" -name "*.bak" -delete 2>/dev/null
  echo -e "${GREEN}✓${NC} 调试/备份文件已清理"

  # 2. 从 git 中移除 node_modules
  if [ -d "$PROJECT_ROOT/.git" ]; then
    NM_TRACKED=$(cd "$PROJECT_ROOT" && git ls-files node_modules 2>/dev/null | head -1 | wc -l)
    if [ "$NM_TRACKED" -gt 0 ]; then
      echo "从 git 中移除 node_modules..."
      cd "$PROJECT_ROOT"
      git rm -r --cached node_modules 2>/dev/null
      git commit -m "chore: remove node_modules from git tracking" 2>/dev/null
      echo -e "${GREEN}✓${NC} node_modules 已从 git 中移除"
    fi
  fi

  echo ""
  echo -e "${GREEN}✅ 自动修复完成，请重新运行校验脚本。${NC}"
}

# 如果指定了 --fix，执行修复后退出
if [ "$FIX" = true ]; then
  fix_issues
  exit 0
fi

# ============================================================
# 统计输出
# ============================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}通过: $PASSED${NC}"
echo -e "${YELLOW}警告: $WARNINGS${NC}"
echo -e "${RED}错误: $ERRORS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo -e "${RED}❌ 校验失败！请修复上述错误后重新提交。${NC}"
  echo -e "提示：运行 ${YELLOW}./scripts/validate-skills.sh --fix${NC} 尝试自动修复部分问题"
  exit 1
else
  echo ""
  echo -e "${GREEN}✅ 校验通过！代码符合 Skills 规范。${NC}"
  exit 0
fi
