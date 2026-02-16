# 小蚁搬运平台 - 端口配置指南

## 端口配置选项

后端服务支持以下端口配置选项，按优先级排序：

1. **BACKEND_PORT** (最高优先级) - 专门用于后端服务端口
2. **PORT** (次优先级) - 通用端口配置
3. **默认值 3000** - 如果以上都没有设置，则使用默认值

## 配置方法

### 1. 环境变量配置

在 `backend/.env` 文件中添加：

```bash
# 后端服务端口配置
BACKEND_PORT=4000
# 或者使用 PORT (较低优先级)
PORT=4000
```

### 2. 启动时指定环境变量

```bash
# Linux/Mac
BACKEND_PORT=5000 npm run dev:backend

# Windows
set BACKEND_PORT=5000 && npm run dev:backend
```

### 3. PM2 配置

在 `ecosystem.config.js` 中：

```javascript
module.exports = {
  apps: [{
    name: 'xiaoyi-banyun',
    script: './backend/server.js',
    env: {
      NODE_ENV: 'production',
      BACKEND_PORT: 4000  // 指定后端端口
    }
  }]
};
```

## 验证端口配置

启动服务后，检查控制台输出确认服务启动的端口：

```
小蚁搬运后端服务启动在端口 XXXX
API文档地址: http://localhost:XXXX/api-docs
```

## 常见端口问题解决

### 端口被占用
如果遇到端口被占用的错误，可以：
1. 更改端口配置
2. 终止占用端口的进程：`lsof -ti:4000 | xargs kill -9`

### 环境变量未生效
1. 确认环境变量已正确设置：`echo $BACKEND_PORT`
2. 重启服务以加载新的环境变量
3. 检查 .env 文件路径是否正确