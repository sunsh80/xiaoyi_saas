#!/bin/bash

# ============================================
#  OpenAPI 监控服务管理脚本
#  用法:
#    ./scripts/openapi-watcher.sh install   - 安装并启动 launchd 服务
#    ./scripts/openapi-watcher.sh uninstall - 停止并卸载服务
#    ./scripts/openapi-watcher.sh start     - 启动服务
#    ./scripts/openapi-watcher.sh stop      - 停止服务
#    ./scripts/openapi-watcher.sh restart   - 重启服务
#    ./scripts/openapi-watcher.sh status    - 查看服务状态
#    ./scripts/openapi-watcher.sh logs      - 查看实时日志
#    ./scripts/openapi-watcher.sh run       - 前台直接运行（调试用）
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLIST_SRC="$SCRIPT_DIR/com.xiaoyibanyun.watch-openapi.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.xiaoyibanyun.watch-openapi.plist"
SERVICE_LABEL="com.xiaoyibanyun.watch-openapi"
WATCH_SCRIPT="$SCRIPT_DIR/watch-openapi.js"
LOG_FILE="$SCRIPT_DIR/watch-openapi.log"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║   小蚁搬运 - OpenAPI 监控服务管理工具   ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
  echo ""
}

check_prerequisites() {
  # 检查 Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}[错误] 未找到 Node.js，请先安装 Node.js${NC}"
    exit 1
  fi

  # 检查监控脚本
  if [ ! -f "$WATCH_SCRIPT" ]; then
    echo -e "${RED}[错误] 未找到监控脚本: $WATCH_SCRIPT${NC}"
    exit 1
  fi

  # 检查 swagger-cli
  if [ ! -f "$PROJECT_DIR/node_modules/.bin/swagger-cli" ]; then
    echo -e "${YELLOW}[警告] 未找到 swagger-cli，正在安装依赖...${NC}"
    cd "$PROJECT_DIR" && npm install
  fi

  # 检查 openapi.yaml
  if [ ! -f "$PROJECT_DIR/openapi.yaml" ]; then
    echo -e "${RED}[错误] 未找到 openapi.yaml 文件${NC}"
    exit 1
  fi
}

do_install() {
  print_header
  echo -e "${CYAN}[安装] 正在安装 launchd 服务...${NC}"
  check_prerequisites

  # 确保 LaunchAgents 目录存在
  mkdir -p "$HOME/Library/LaunchAgents"

  # 如果已安装，先卸载
  if [ -f "$PLIST_DST" ]; then
    echo -e "${YELLOW}[安装] 检测到已有服务，先卸载旧版本...${NC}"
    launchctl bootout "gui/$(id -u)/$SERVICE_LABEL" 2>/dev/null || true
    rm -f "$PLIST_DST"
  fi

  # 复制 plist 文件
  cp "$PLIST_SRC" "$PLIST_DST"
  echo -e "${GREEN}[安装] plist 已复制到: $PLIST_DST${NC}"

  # 加载服务
  launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
  echo -e "${GREEN}[安装] 服务已加载并启动${NC}"

  echo ""
  echo -e "${GREEN}✅ 安装完成! 服务将在系统登录时自动启动。${NC}"
  echo -e "   查看状态: $0 status"
  echo -e "   查看日志: $0 logs"
  echo ""
}

do_uninstall() {
  print_header
  echo -e "${CYAN}[卸载] 正在卸载 launchd 服务...${NC}"

  if [ -f "$PLIST_DST" ]; then
    launchctl bootout "gui/$(id -u)/$SERVICE_LABEL" 2>/dev/null || true
    rm -f "$PLIST_DST"
    echo -e "${GREEN}[卸载] 服务已停止并卸载${NC}"
  else
    echo -e "${YELLOW}[卸载] 服务未安装${NC}"
  fi

  echo -e "${GREEN}✅ 卸载完成${NC}"
}

do_start() {
  echo -e "${CYAN}[启动] 正在启动服务...${NC}"
  if [ ! -f "$PLIST_DST" ]; then
    echo -e "${RED}[错误] 服务未安装，请先运行: $0 install${NC}"
    exit 1
  fi
  launchctl kickstart "gui/$(id -u)/$SERVICE_LABEL" 2>/dev/null || \
    launchctl bootstrap "gui/$(id -u)" "$PLIST_DST" 2>/dev/null || true
  echo -e "${GREEN}✅ 服务已启动${NC}"
}

do_stop() {
  echo -e "${CYAN}[停止] 正在停止服务...${NC}"
  launchctl kill SIGTERM "gui/$(id -u)/$SERVICE_LABEL" 2>/dev/null || true
  echo -e "${GREEN}✅ 服务已停止${NC}"
}

do_restart() {
  do_stop
  sleep 1
  do_start
}

do_status() {
  print_header
  echo -e "${CYAN}[状态] 服务状态:${NC}"
  echo ""

  if [ ! -f "$PLIST_DST" ]; then
    echo -e "  安装状态: ${RED}未安装${NC}"
    return
  fi

  echo -e "  安装状态: ${GREEN}已安装${NC}"

  # 检查运行状态
  if launchctl print "gui/$(id -u)/$SERVICE_LABEL" &>/dev/null; then
    local pid
    pid=$(launchctl print "gui/$(id -u)/$SERVICE_LABEL" 2>/dev/null | grep "pid" | head -1 | awk '{print $NF}')
    if [ -n "$pid" ] && [ "$pid" != "0" ]; then
      echo -e "  运行状态: ${GREEN}运行中 (PID: $pid)${NC}"
    else
      echo -e "  运行状态: ${YELLOW}已加载，等待启动${NC}"
    fi
  else
    echo -e "  运行状态: ${RED}未运行${NC}"
  fi

  echo -e "  监控文件: $PROJECT_DIR/openapi.yaml"
  echo -e "  日志文件: $LOG_FILE"

  # 显示最近几条日志
  if [ -f "$LOG_FILE" ]; then
    echo ""
    echo -e "${CYAN}[最近日志]${NC}"
    tail -5 "$LOG_FILE" 2>/dev/null || true
  fi
  echo ""
}

do_logs() {
  echo -e "${CYAN}[日志] 实时日志输出 (Ctrl+C 退出):${NC}"
  echo ""
  if [ -f "$LOG_FILE" ]; then
    tail -f "$LOG_FILE"
  else
    echo -e "${YELLOW}日志文件不存在，服务可能尚未运行${NC}"
    echo "等待日志生成..."
    while [ ! -f "$LOG_FILE" ]; do sleep 1; done
    tail -f "$LOG_FILE"
  fi
}

do_run() {
  print_header
  echo -e "${CYAN}[前台运行] 直接启动监控（Ctrl+C 停止）...${NC}"
  echo ""
  check_prerequisites
  node "$WATCH_SCRIPT"
}

# ─── 主入口 ──────────────────────────────

case "${1:-}" in
  install)    do_install ;;
  uninstall)  do_uninstall ;;
  start)      do_start ;;
  stop)       do_stop ;;
  restart)    do_restart ;;
  status)     do_status ;;
  logs)       do_logs ;;
  run)        do_run ;;
  *)
    print_header
    echo "用法: $0 {install|uninstall|start|stop|restart|status|logs|run}"
    echo ""
    echo "  install   - 安装并启动 launchd 服务（开机自启）"
    echo "  uninstall - 停止并卸载服务"
    echo "  start     - 启动服务"
    echo "  stop      - 停止服务"
    echo "  restart   - 重启服务"
    echo "  status    - 查看服务状态"
    echo "  logs      - 查看实时日志"
    echo "  run       - 前台直接运行（调试用）"
    echo ""
    exit 1
    ;;
esac
