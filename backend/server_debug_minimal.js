// server_debug_minimal.js - 最小化服务器
// 不加载 .env, 不设置任何中间件，只监听端口
const express = require('express');
const app = express();
const PORT = 4002; // 使用另一个端口

app.get('/', (req, res) => {
  res.send('Minimal Server OK');
});

app.listen(PORT, () => {
  console.log(`最小化服务器启动在端口 ${PORT}`);
});