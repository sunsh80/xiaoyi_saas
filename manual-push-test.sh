#!/bin/bash

# 手动测试推送脚本

echo "小蚁搬运平台推送测试"
echo "=================="

# 设置路径
SCRIPT_PATH="/Users/sunsh80/Downloads/易工到项目/小蚁搬运/auto-push.sh"
LOG_FILE="/Users/sunsh80/Downloads/易工到项目/小蚁搬运/manual-push-test.log"

# 检查脚本是否存在
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "错误: 脚本文件不存在 $SCRIPT_PATH"
    exit 1
fi

echo "开始手动推送测试..."
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 运行推送脚本并将输出同时显示在终端和记录到日志
bash "$SCRIPT_PATH" 2>&1 | tee -a "$LOG_FILE"

echo ""
echo "推送测试完成"
echo "日志已保存到: $LOG_FILE"