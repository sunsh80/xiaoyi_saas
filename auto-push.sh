#!/bin/bash

# 小蚁搬运平台自动推送脚本（精简版）
# 每日11点自动推送代码到远程仓库，遇到问题时持续重试直到成功

# 日志文件路径
LOG_FILE="/Users/sunsh80/Downloads/易工到项目/小蚁搬运/auto-push.log"
REPO_PATH="/Users/sunsh80/Downloads/易工到项目/小蚁搬运"

# 记录日志的函数
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# 推送函数
attempt_push() {
    log_message "开始尝试推送代码..."
    
    # 进入仓库目录
    cd "$REPO_PATH" || {
        log_message "错误: 无法进入仓库目录 $REPO_PATH"
        return 1
    }
    
    # 获取当前分支
    BRANCH=$(git branch --show-current)
    if [ -z "$BRANCH" ]; then
        log_message "错误: 无法获取当前分支"
        return 1
    fi
    
    # 拉取最新代码以防冲突（使用rebase方式处理分歧）
    log_message "拉取远程仓库最新代码..."
    if ! git pull --rebase origin "$BRANCH"; then
        log_message "警告: 拉取远程代码失败，但将继续推送"
    fi
    
    # 检查是否有需要提交的更改
    if ! git diff-index --quiet HEAD --; then
        log_message "检测到更改，添加并提交更改..."
        git add .
        git commit -m "Auto-commit: $(date '+%Y-%m-%d %H:%M:%S') - 包含性能优化和API响应改进"
    fi
    
    # 尝试推送
    log_message "正在推送代码到远程仓库..."
    if git push origin "$BRANCH" --verbose; then
        log_message "推送成功!"
        return 0
    else
        log_message "普通推送失败，尝试强制推送..."
        # 如果普通推送失败，尝试强制推送（使用--force-with-lease更安全）
        if git push --force-with-lease origin "$BRANCH" --verbose; then
            log_message "强制推送成功!"
            return 0
        elif [ "$BRANCH" != "main" ]; then
            # 如果当前分支不是main，也尝试推送到main
            log_message "当前分支不是main，尝试推送到main分支..."
            if git push --force-with-lease origin "$BRANCH:main" --verbose; then
                log_message "推送到main分支成功!"
                return 0
            else
                log_message "推送到main分支失败，错误代码: $?"
                return 1
            fi
        else
            log_message "推送失败，错误代码: $?"
            return 1
        fi
    fi
}

# 持续推送直到成功
continuous_push() {
    log_message "开始持续推送循环..."
    
    attempt_count=1
    while true; do
        log_message "推送尝试 #$attempt_count"
        
        if attempt_push; then
            log_message "推送成功完成，退出循环"
            break
        else
            log_message "推送失败，将在30秒后重试..."
            sleep 30
            attempt_count=$((attempt_count + 1))
        fi
    done
}

# 主函数
main() {
    log_message "========== 自动推送脚本启动 =========="
    
    # 检查仓库是否存在
    if [ ! -d "$REPO_PATH/.git" ]; then
        log_message "错误: 仓库目录不存在或不是一个git仓库: $REPO_PATH"
        exit 1
    fi
    
    # 执行推送
    continuous_push
    
    log_message "========== 自动推送脚本结束 =========="
}

# 运行主函数
main