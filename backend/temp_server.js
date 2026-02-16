const express = require('express');
const app = express();
const PORT = 3001;

app.get('/', (req, res) => {
  res.send('Temp Server OK');
});

app.listen(PORT, () => {
  console.log(`临时服务器启动在端口 ${PORT}`);
});