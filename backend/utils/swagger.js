const swaggerUi = require('swagger-ui-express');
const yaml = require('yaml');
const fs = require('fs');
const path = require('path');

// 加载模块化 OpenAPI 规范文件
const openApiPath = path.join(__dirname, '../../openapi/openapi.yaml');
const document = yaml.parse(fs.readFileSync(openApiPath, 'utf8'));

module.exports = {
  specs: document,
  swaggerUi
};
