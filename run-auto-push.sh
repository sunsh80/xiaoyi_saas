#!/bin/bash

# 定时任务脚本 - 每天11点运行自动推送脚本

# 设置脚本路径
SCRIPT_PATH="/Users/sunsh80/Downloads/易工到项目/小蚁搬运/auto-push.sh"

# 检查脚本是否存在
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "错误: 脚本文件不存在 $SCRIPT_PATH"
    exit 1
fi

# 运行推送脚本
echo "$(date '+%Y-%m-%d %H:%M:%S') - 运行自动推送脚本" >> /Users/sunsh80/Downloads/易工到项目/小蚁搬运/cron-push.log
bash "$SCRIPT_PATH" >> /Users/sunsh80/Downloads/易工到项目/小蚁搬运/cron-push.log 2>&1