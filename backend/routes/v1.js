// backend/routes/v1.js

const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenant');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const ThirdPartyOrderController = require('../controllers/ThirdPartyOrderController');
const WechatPayController = require('../controllers/WechatPayController');
const WebhookIncomingController = require('../controllers/WebhookIncomingController');

// 租户中间件（微信支付回调 & Webhook 豁免）
router.use((req, res, next) => {
  // req.originalUrl 包含完整路径如 /api/v1/webhook/incoming/saas
  // req.path 在 router 中是相对于挂载点的路径
  const fullPath = req.originalUrl || req.path;

  if (req.path === '/payments/wechat/notify' ||
      fullPath.includes('/webhook/incoming/')) {
    return next();
  }
  tenantMiddleware(req, res, next);
});

// ======================
// 第三方订单 API
// ======================
router.post('/orders', apiKeyAuth, ThirdPartyOrderController.create);
router.get('/orders/reconciliation', apiKeyAuth, ThirdPartyOrderController.reconciliation);
router.get('/orders/:order_no', apiKeyAuth, ThirdPartyOrderController.getByOrderNo);
router.post('/orders/:order_no/cancel', apiKeyAuth, ThirdPartyOrderController.cancelOrder);

// ======================
// 微信支付
// ======================
router.post('/payments/wechat/notify', WechatPayController.notify);
router.post('/payments/wechat/create', apiKeyAuth, WechatPayController.createPayment);

// ======================
// Webhook 接收 API
// ======================
// Webhook 推送入口（不使用 apiKeyAuth，签名由适配器自行验证）
router.post('/webhook/incoming/:platform_code', WebhookIncomingController.receive);

module.exports = router;
