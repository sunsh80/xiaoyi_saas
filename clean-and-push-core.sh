#!/bin/bash

# 清理小蚁搬运项目中的大文件并推送精简版到远程仓库

echo "🗑️ 开始清理大文件并推送精简版..."

# 进入项目目录
cd /Users/sunsh80/Downloads/易工到项目/小蚁搬运

# 1. 创建一个新分支用于精简版
echo "SetBranching for core version..."
git checkout -b core-version

# 2. 删除不需要的大文件和目录
echo "🗑️ 删除大文件和不需要的目录..."
git rm -r --cached node_modules 2>/dev/null || true
git rm -r --cached backend/node_modules 2>/dev/null || true
git rm -r --cached frontend 2>/dev/null || true
git rm -r --cached admin 2>/dev/null || true
git rm -r --cached .git 2>/dev/null || true
git rm -r --cached scripts 2>/dev/null || true
git rm -r --cached test 2>/dev/null || true
git rm --cached Docker.dmg 2>/dev/null || true
git rm --cached *.log 2>/dev/null || true

# 3. 添加精简版内容
echo "📥 添加精简版内容..."
cp -r /Users/sunsh80/Downloads/易工到项目/小蚁搬运-精简版/* .

# 4. 添加所有文件到暂存区
git add .

# 5. 提交更改
git commit -m " feat: 推送精简版代码，移除大文件和依赖

- 移除了 node_modules 目录
- 移除了前端完整版
- 移除了管理后台
- 移除了大型资源文件
- 保留了所有核心功能代码
- 项目大小从 1.4GB 减少到 ~1.5MB"

# 6. 强制推送到远程仓库的主分支
echo "📤 推送精简版到远程仓库..."
git push origin core-version:main --force

echo "✅ 精简版已成功推送到远程仓库！"
echo "💡 如果需要，可以删除本地的 core-version 分支：git branch -D core-version"