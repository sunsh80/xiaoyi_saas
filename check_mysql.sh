#!/bin/bash
# 检查 MySQL 是否安装完成的脚本

echo "检查 MySQL 安装状态..."

if command -v mysql &> /dev/null; then
    echo "MySQL 已安装，版本信息："
    mysql --version
    
    # 检查 MySQL 服务是否运行
    if pgrep mysqld > /dev/null; then
        echo "MySQL 服务正在运行"
    else
        echo "MySQL 服务未运行，尝试启动..."
        if command -v brew &> /dev/null; then
            brew services start mysql
        fi
    fi
    
    # 检查是否能连接到 MySQL
    if mysql -u root -e "SHOW DATABASES;" &> /dev/null; then
        echo "能够连接到 MySQL 服务器"
        
        # 检查 XIAOYI 数据库是否存在
        if mysql -u root -e "USE XIAOYI;" &> /dev/null; then
            echo "XIAOYI 数据库已存在"
        else
            echo "XIAOYI 数据库不存在，需要创建"
        fi
    else
        echo "无法连接到 MySQL 服务器，请确保服务已启动"
    fi
else
    echo "MySQL 未安装，请等待安装完成..."
    
    # 检查安装进程是否仍在运行
    if pgrep -f "brew.*install.*mysql" > /dev/null; then
        echo "MySQL 安装进程仍在运行，请继续等待..."
        ps aux | grep -i "brew.*install.*mysql"
    else
        echo "MySQL 安装进程似乎已停止，可能需要重新安装"
    fi
fi