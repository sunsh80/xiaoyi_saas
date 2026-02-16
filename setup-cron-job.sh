#!/bin/bash

# 设置自动推送的cron作业
# 该脚本会设置每天上午11点自动运行推送脚本

CRON_JOB="0 11 * * * /bin/bash /Users/sunsh80/Downloads/易工到项目/小蚁搬运/run-auto-push.sh"

# 检查是否已有相同的cron作业
if crontab -l 2>/dev/null | grep -Fq "run-auto-push.sh"; then
    echo "发现已存在的cron作业，正在更新..."
    # 删除旧的作业
    crontab -l 2>/dev/null | grep -v "run-auto-push.sh" | crontab -
else
    echo "未发现现有作业，正在创建新的cron作业..."
fi

# 添加新的cron作业
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "Cron作业已设置成功！"
echo "每天上午11:00将自动运行推送脚本"
echo "脚本路径: /Users/sunsh80/Downloads/易工到项目/小蚁搬运/run-auto-push.sh"
echo ""
echo "当前cron作业列表："
crontab -l