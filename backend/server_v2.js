// server_v2.js - 最简化的服务器，用于测试
require('dotenv').config({ path: './.env' }); // 确保加载环境变量
const express = require('express');
const app = express();

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 一个简单的健康检查路由
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 一个模拟 API 路由，不涉及数据库
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Test API OK', data: { timestamp: new Date().toISOString() }});
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`简化版服务器启动在端口 ${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`测试API: http://localhost:${PORT}/api/test`);
});