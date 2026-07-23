// backend/routes/v1.js

const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenant');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const ThirdPartyOrderController = require('../controllers/ThirdPartyOrderController');
const WechatPayController = require('../controllers/WechatPayController');

// 租户中间件（微信支付回调豁免）
router.use((req, res, next) => {
  if (req.path === '/payments/wechat/notify') {
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

module.exports = router;
