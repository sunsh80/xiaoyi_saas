# 小蚁搬运本地开发Docker配置

## Dockerfile.backend
```dockerfile
FROM node:16-alpine

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
COPY backend/package*.json ./backend/

# 安装依赖
RUN npm install
RUN cd backend && npm install && cd ..

# 复制源代码
COPY . .

# 创建上传目录
RUN mkdir -p uploads

# 暴露端口
EXPOSE 4000

# 启动命令
CMD ["npm", "run", "dev"]
```

## Dockerfile.frontend (如果需要)
```dockerfile
FROM node:16-alpine

WORKDIR /app

# 安装微信开发者工具所需的依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++

# 复制前端代码
COPY frontend/ ./frontend/

WORKDIR /app/frontend

# 安装依赖
RUN npm install

EXPOSE 8080

CMD ["npm", "start"]
```

## docker-compose.dev.yml
```yaml
version: '3.8'

services:
  # SQLite数据库
  mysql-dev:
    image: mysql:8.0
    container_name: xiaoyi-banyun-mysql-dev
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: dev_root_password
      MYSQL_DATABASE: xiaoyi_banyun_dev
      MYSQL_USER: dev_user
      MYSQL_PASSWORD: dev_password
    volumes:
      - mysql_dev_data:/var/lib/mysql
      - ./init-dev.sql:/docker-entrypoint-initdb.d/init-dev.sql
    command: --default-authentication-plugin=mysql_native_password
    restart: unless-stopped

  # Redis (用于会话和缓存)
  redis-dev:
    image: redis:alpine
    container_name: xiaoyi-banyun-redis-dev
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data
    restart: unless-stopped

  # 后端服务
  backend-dev:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: xiaoyi-banyun-backend-dev
    ports:
      - "4000:4000"
    depends_on:
      - mysql-dev
      - redis-dev
    environment:
      - NODE_ENV=development
      - DB_HOST=mysql-dev
      - DB_PORT=3306
      - DB_USER=dev_user
      - DB_PASSWORD=dev_password
      - DB_NAME=xiaoyi_banyun_dev
      - REDIS_HOST=redis-dev
      - REDIS_PORT=6379
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
    restart: unless-stopped

  # 前端代理 (可选)
  nginx-dev:
    image: nginx:alpine
    container_name: xiaoyi-banyun-nginx-dev
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-dev.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend-dev
    restart: unless-stopped

volumes:
  mysql_dev_data:
  redis_dev_data:
```

## nginx-dev.conf (开发环境)
```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend_dev {
        server backend-dev:3000;
    }

    server {
        listen 80;
        server_name localhost;

        # API请求代理
        location /api/ {
            proxy_pass http://backend_dev/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # 开发环境设置
            proxy_set_header X-Forwarded-Host $server_name;
            proxy_set_header X-Original-Forwarded-For $http_x_forwarded_for;
        }

        # 偰护端点
        location /health {
            access_log off;
            return 200 '{"status":"ok","service":"xiaoyi-banyun","environment":"development"}\n';
            add_header Content-Type application/json;
        }

        # 静态文件服务
        location / {
            root /usr/share/nginx/html;
            index index.html index.htm;
            try_files $uri $uri/ /index.html;
        }
    }
}
```

## init-dev.sql (开发数据库初始化)
```sql
-- 开发环境数据库初始化脚本

-- 创建开发数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS xiaoyi_banyun_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE xiaoyi_banyun_dev;

-- 创建示例数据
INSERT INTO tenants (tenant_code, name, contact_person, contact_phone, email, address, status, created_at) 
VALUES ('dev_tenant', '开发测试租户', '开发人员', '13800138000', 'dev@example.com', '北京市开发测试地址', 1, NOW())
ON DUPLICATE KEY UPDATE name = name;

-- 创建开发测试用户
INSERT INTO users (tenant_id, username, password_hash, phone, email, real_name, role, status, created_at) 
SELECT t.id, 'dev_user', '$2a$10$8K1p/aYkZU8QbL.sfhM80eQiV.FytfHPTqSWJrKsLaO7Gakqc9K9C', '13800138001', 'devuser@example.com', '开发测试用户', 'worker', 1, NOW()
FROM tenants t 
WHERE t.tenant_code = 'dev_tenant'
LIMIT 1
ON DUPLICATE KEY UPDATE username = username;

-- 插入系统配置
INSERT INTO system_configs (config_key, config_value, description) VALUES
('commission_rate', '0.1000', '默认抽佣比例 10%'),
('payment_methods', '["wechat_pay", "alipay"]', '可用支付方式'),
('min_withdrawal_amount', '10.00', '最小提现金额'),
('dev_mode', 'true', '开发模式')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- 创建示例推荐活动
INSERT INTO referral_campaigns (
    campaign_name, 
    campaign_title, 
    campaign_description, 
    share_title, 
    share_desc, 
    referral_reward_type, 
    referral_reward_amount, 
    referee_reward_type, 
    referee_reward_amount, 
    start_time, 
    end_time, 
    status,
    created_at
) VALUES (
    '开发测试活动',
    '开发环境推荐活动',
    '仅供开发测试使用的推荐活动',
    '快来加入小蚁搬运开发测试',
    '开发测试环境，安全可靠',
    'fixed',
    5.00,
    'fixed',
    2.00,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    DATE_ADD(NOW(), INTERVAL 30 DAY),
    'active',
    NOW()
) ON DUPLICATE KEY UPDATE campaign_name = campaign_name;
```

## 本地开发命令

### 启动开发环境
```bash
# 使用Docker Compose启动
docker-compose -f docker-compose.dev.yml up -d

# 查看服务状态
docker-compose -f docker-compose.dev.yml ps

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f
```

### 偰止开发环境
```bash
docker-compose -f docker-compose.dev.yml down
```

### 重建服务
```bash
docker-compose -f docker-compose.dev.yml up -d --build
```

## 本地开发最佳实践

### 1. 环境隔离
- 开发环境使用独立的数据库
- 使用不同的端口避免冲突
- 环境变量区分开发/生产

### 2. 数据管理
- 开发数据库定期备份
- 使用种子数据快速初始化
- 遰度测试数据与生产隔离

### 3. 调试工具
- 开启详细日志
- 使用开发模式的错误堆栈
- 集成调试工具

### 4. 性能优化
- 代码热重载
- 资源缓存配置
- 数据库查询优化

## 灰度部署策略

### 1. 渐进式发布
- 10% -> 25% -> 50% -> 100% 流量切换
- 每个阶段监控关键指标
- 自动回滚机制

### 2. 监控指标
- 响应时间
- 错误率
- 吞吐量
- 用户满意度

### 3. 回滚策略
- 错误率 > 5% 自动回滚
- 响应时间 > 2s 警告
- 可用性 < 95% 回滚
```

### 本地开发环境启动脚本 (start-dev-env.sh)
```bash
#!/bin/bash

# 小蚁搬运本地开发环境启动脚本

set -e

echo "🚀 启动小蚁搬运本地开发环境..."

# 检查Docker是否运行
if ! docker info &>/dev/null; then
    echo "❌ Docker 未运行，请先启动 Docker Desktop"
    exit 1
fi

echo "✅ Docker 运行正常"

# 启动开发环境
echo "🐳 启动开发环境容器..."
docker-compose -f docker-compose.dev.yml up -d

# 等待服务启动
echo "⏱️  等待服务启动..."
sleep 10

# 检查服务状态
echo "📋 服务状态:"
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "🎉 本地开发环境启动完成！"
echo ""
echo "📊 服务信息:"
echo "   后端服务: http://localhost:3000"
echo "   数据库: localhost:3306 (dev_user/dev_password)"
echo "   Redis: localhost:6379"
echo ""
echo "🔧 开发工具:"
echo "   API文档: http://localhost:3000/api-docs"
echo "   前端: 微信开发者工具 -> frontend/miniprogram"
echo ""
echo "📋 常用命令:"
echo "   查看日志: docker-compose -f docker-compose.dev.yml logs -f"
echo "   偰止服务: docker-compose -f docker-compose.dev.yml down"
echo "   重启服务: docker-compose -f docker-compose.dev.yml restart"
echo ""
```