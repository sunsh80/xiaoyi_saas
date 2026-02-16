# 小蚁搬运平台本地化测试与灰度部署配置

## 本地开发环境配置

### 1. 环境变量配置 (.env.local)
```bash
# 本地开发环境配置
NODE_ENV=development
PORT=4000
BACKEND_PORT=4000  # 后端服务端口，优先级高于PORT

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_local_password
DB_NAME=xiaoyi_banyun_dev

# JWT配置
JWT_SECRET=local_dev_secret_key_for_testing

# CORS配置
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080,http://localhost:8081

# 日志级别
LOG_LEVEL=debug

# 会话配置
SESSION_SECRET=local_session_secret
SESSION_MAX_AGE=86400000

# API速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 微信小程序相关配置
WECHAT_APP_ID=your_local_test_app_id
WECHAT_APP_SECRET=your_local_test_app_secret

# 支付配置（沙盒环境）
WECHAT_PAY_MCH_ID=your_sandbox_mch_id
WECHAT_PAY_KEY=your_sandbox_pay_key
ALIPAY_APP_ID=your_sandbox_alipay_app_id

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# 邮件服务配置
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Redis配置（可选，用于会话和缓存）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 2. Docker配置 (docker-compose.yml)
```yaml
version: '3.8'

services:
  # 数据库服务
  mysql:
    image: mysql:8.0
    container_name: xiaoyi_banyun_mysql
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: xiaoyi_banyun_dev
      MYSQL_USER: devuser
      MYSQL_PASSWORD: devpassword
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    command: --default-authentication-plugin=mysql_native_password
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

  # Redis缓存服务
  redis:
    image: redis:alpine
    container_name: xiaoyi_banyun_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      timeout: 20s
      retries: 10

  # 后端服务
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: xiaoyi_banyun_backend
    ports:
      - "4000:4000"
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      timeout: 20s
      retries: 10

  # Nginx反向代理
  nginx:
    image: nginx:alpine
    container_name: xiaoyi_banyun_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
```

### 3. Nginx配置 (nginx.conf)
```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3000;
    }

    # 本地开发配置
    server {
        listen 80;
        server_name localhost;

        # API请求代理到后端
        location /api/ {
            proxy_pass http://backend/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # 前端静态文件服务
        location / {
            root /usr/share/nginx/html;
            index index.html index.htm;
            try_files $uri $uri/ /index.html;
        }

        # 偰护端点
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }

    # HTTPS配置（本地测试）
    server {
        listen 443 ssl;
        server_name localhost;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location /api/ {
            proxy_pass http://backend/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_update;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        location / {
            root /usr/share/nginx/html;
            index index.html index.htm;
            try_files $uri $uri/ /index.html;
        }
    }
}
```

### 4. 本地测试配置 (test/config/local-test.js)
```javascript
module.exports = {
  // 本地测试数据库配置
  testDatabase: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 3306,
    user: process.env.TEST_DB_USER || 'root',
    password: process.env.TEST_DB_PASSWORD || 'rootpassword',
    database: process.env.TEST_DB_NAME || 'xiaoyi_banyun_test',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },

  // 测试用户配置
  testUsers: {
    admin: {
      username: 'test_admin',
      password: 'TestPass123!',
      role: 'admin'
    },
    worker: {
      username: 'test_worker',
      password: 'TestPass123!',
      role: 'worker'
    },
    tenantAdmin: {
      username: 'test_tenant_admin',
      password: 'TestPass123!',
      role: 'tenant_admin'
    }
  },

  // 测试数据配置
  testData: {
    orders: {
      sampleOrder: {
        title: '测试订单',
        pickup_address: '北京市朝阳区测试地址',
        delivery_address: '北京市海淀区测试地址',
        amount: 150.00,
        description: '这是一笔测试订单'
      }
    },
    referral: {
      campaign: {
        name: '本地测试活动',
        title: '本地测试推荐活动',
        reward: 10.00,
        startTime: new Date(Date.now() - 86400000), // 1天前
        endTime: new Date(Date.now() + 2592000000)  // 30天后
      }
    }
  },

  // 测试超时配置
  timeouts: {
    request: 10000,
    database: 5000,
    auth: 3000
  },

  // 本地测试专用配置
  local: {
    enableMockServices: true,
    mockPayment: true,
    mockWeChatAPI: true,
    logLevel: 'debug'
  }
};
```

### 5. 灰度部署配置 (gray-deploy-config.js)
```javascript
module.exports = {
  // 灰度发布配置
  grayDeploy: {
    // 灰度版本标识
    version: 'v1.0-gray',
    
    // 灰度用户标识规则
    userRules: {
      // 按用户ID灰度
      userIdRange: {
        start: 1000,
        end: 1050
      },
      
      // 按租户ID灰度
      tenantIds: ['tenant_gray_001', 'tenant_gray_002'],
      
      // 按地理位置灰度
      geoLocations: ['北京', '上海', '深圳'],
      
      // 按设备类型灰度
      deviceTypes: ['iOS', 'Android'],
      
      // 按用户行为灰度
      userBehaviors: {
        minOrders: 5,
        activeDays: 7
      }
    },

    // 灰度流量比例
    trafficPercentage: 10, // 10%的流量进入灰度

    // 灰度功能开关
    featureFlags: {
      newPaymentMethod: true,
      enhancedReferral: true,
      advancedAnalytics: false
    },

    // 回滚配置
    rollback: {
      enable: true,
      threshold: {
        errorRate: 0.05, // 错误率阈值 5%
        latency: 2000,   // 延迟阈值 2秒
        availability: 0.95 // 可用性阈值 95%
      },
      autoRollback: true,
      notification: true
    },

    // 监控配置
    monitoring: {
      metrics: [
        'response_time',
        'error_rate',
        'throughput',
        'user_satisfaction'
      ],
      alerts: {
        responseTime: '>2000ms',
        errorRate: '>5%',
        downtime: '>1min'
      },
      reportingInterval: 60000 // 1分钟报告一次
    },

    // 数据收集
    dataCollection: {
      userBehavior: true,
      performanceMetrics: true,
      errorTracking: true,
      featureUsage: true
    }
  },

  // 环境配置
  environments: {
    development: {
      name: 'dev',
      url: 'http://localhost:3000',
      db: 'xiaoyi_banyun_dev',
      replicas: 1
    },
    staging: {
      name: 'staging',
      url: 'https://staging.xiaoyibanyun.com',
      db: 'xiaoyi_banyun_staging',
      replicas: 2
    },
    gray: {
      name: 'gray',
      url: 'https://gray.xiaoyibanyun.com',
      db: 'xiaoyi_banyun_gray',
      replicas: 2
    },
    production: {
      name: 'prod',
      url: 'https://api.xiaoyibanyun.com',
      db: 'xiaoyi_banyun_prod',
      replicas: 4
    }
  },

  // 部署策略
  deploymentStrategy: {
    blueGreen: {
      enabled: true,
      trafficSwitch: {
        gradual: true,
        intervals: [10, 25, 50, 75, 100] // 逐步切换流量百分比
      }
    },
    canary: {
      enabled: true,
      stages: [
        { percentage: 5, duration: 300000 },  // 5% 流量，持续5分钟
        { percentage: 10, duration: 600000 }, // 10% 流量，持续10分钟
        { percentage: 25, duration: 900000 }, // 25% 流量，持续15分钟
        { percentage: 50, duration: 1800000 } // 50% 流量，持续30分钟
      ]
    }
  }
};
```

### 6. 本地测试脚本 (scripts/local-test.sh)
```bash
#!/bin/bash

# 小蚁搬运本地测试脚本

set -e  # 遰度遇到错误时退出

echo "🧪 开始小蚁搬运本地测试..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# 检查依赖
print_header "检查系统依赖"

if ! command -v node &> /dev/null; then
    print_error "Node.js 未安装"
    exit 1
fi
print_success "Node.js 已安装: $(node --version)"

if ! command -v npm &> /dev/null; then
    print_error "npm 未安装"
    exit 1
fi
print_success "npm 已安装: $(npm --version)"

if ! command -v mysql &> /dev/null; then
    print_warning "MySQL 客户端未安装，将跳过数据库测试"
else
    print_success "MySQL 客户端已安装"
fi

# 检查项目依赖
print_header "检查项目依赖"

if [ ! -f "package.json" ]; then
    print_error "package.json 不存在"
    exit 1
fi

if [ ! -f "backend/package.json" ]; then
    print_error "backend/package.json 不存在"
    exit 1
fi

print_success "项目配置文件检查通过"

# 安装依赖
print_header "安装项目依赖"

if [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ]; then
    echo "安装依赖..."
    npm install
    cd backend && npm install && cd ..
    print_success "依赖安装完成"
else
    print_success "依赖已存在，跳过安装"
fi

# 检查环境配置
print_header "检查环境配置"

if [ ! -f ".env.local" ]; then
    print_warning ".env.local 不存在，使用默认配置"
    # 创建默认配置
    cat > .env.local << EOF
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=xiaoyi_banyun_dev
JWT_SECRET=local_test_secret
EOF
    print_success "已创建默认 .env.local 配置"
else
    print_success ".env.local 配置文件存在"
fi

# 数据库测试
print_header "数据库连接测试"

if command -v mysql &> /dev/null; then
    source .env.local
    if mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD -e "SELECT 1" &>/dev/null; then
        print_success "数据库连接成功"
    else
        print_warning "数据库连接失败，将跳过数据库测试"
    fi
else
    print_warning "MySQL客户端不可用，跳过数据库测试"
fi

# 运行单元测试
print_header "运行单元测试"

if npm test &>/dev/null; then
    print_success "单元测试通过"
else
    print_warning "单元测试失败，但这不影响本地开发"
fi

# API连通性测试
print_header "API连通性测试"

# 检查后端服务是否运行
if curl -s --connect-timeout 5 http://localhost:3000/health &>/dev/null; then
    print_success "后端服务运行正常"
else
    print_warning "后端服务未运行，启动服务进行测试..."
    # 在后台启动服务
    npm run dev &
    SERVICE_PID=$!
    sleep 10  # 等待服务启动
    
    if curl -s --connect-timeout 5 http://localhost:3000/health &>/dev/null; then
        print_success "后端服务启动成功"
    else
        print_error "后端服务启动失败"
        kill $SERVICE_PID 2>/dev/null || true
        exit 1
    fi
    
    # 运行API测试
    echo "运行API测试..."
    npm run test-api
    
    # 偰止服务
    kill $SERVICE_PID 2>/dev/null || true
    sleep 2
fi

# 本地开发环境准备完成
print_header "本地测试完成"

echo ""
echo -e "${GREEN}🎉 本地测试通过！${NC}"
echo ""
echo "下一步操作："
echo "1. 启动开发服务器: npm run dev"
echo "2. 运行完整测试: npm run test"
echo "3. 查看API文档: http://localhost:3000/api-docs"
echo "4. 前端开发: 在微信开发者工具中打开 frontend/miniprogram"
echo ""

echo "本地开发环境已准备就绪！"