// backend/middleware/apiKeyAuth.js

const ThirdPartyPlatform = require('../models/ThirdPartyPlatform');

/**
 * API Key 认证中间件
 * 用于第三方平台接入认证，通过 X-Api-Key 请求头验证
 */
async function apiKeyAuth(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: '缺少 API Key，请在请求头中传入 X-Api-Key'
      });
    }

    const platform = await ThirdPartyPlatform.findByApiKey(apiKey);

    if (!platform) {
      return res.status(401).json({
        success: false,
        message: 'API Key 无效或平台已禁用'
      });
    }

    // 将平台信息挂载到 req 上，供后续 Controller 使用
    req.thirdPartyPlatform = platform;

    next();
  } catch (error) {
    console.error('apiKeyAuth error:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

module.exports = apiKeyAuth;
