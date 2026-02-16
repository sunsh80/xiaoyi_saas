const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger配置
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '小蚁搬运 SaaS 平台 API',
      version: '1.0.0',
      description: '小蚁搬运是一个SaaS架构的多租户跑腿装卸平台，支持货物的装卸搬运工作。',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: '开发环境',
      },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'], // 文件路径，Swagger会从中读取注释
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi
};