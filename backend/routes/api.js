// backend/routes/api.js

const express = require('express');
const router = express.Router();

// 引入中间件
const tenantMiddleware = require('../middleware/tenant');

// 引入控制器（必须在使用前 require）
const AuthController = require('../controllers/AuthController');
const OrderController = require('../controllers/OrderController');
const FinanceController = require('../controllers/FinanceController');
const ReferralController = require('../controllers/ReferralController');
const MapController = require('../controllers/MapController');

// 在 api.js 文件顶部 require 之后，路由定义之前
console.log('[DEBUG] AuthController:', AuthController);
console.log('[DEBUG] AuthController.login:', typeof AuthController.login);
console.log('[DEBUG] OrderController.create:', typeof OrderController.create);
console.log('[DEBUG] OrderController.getById:', typeof OrderController.getById);
console.log('[DEBUG] OrderController.list:', typeof OrderController.list);
console.log('[DEBUG] OrderController.assignOrder:', typeof OrderController.assignOrder);
// ... 其他方法

// 应用租户中间件到所有路由（除支付回调和 admin 路由外）
// 注意：admin 路由有自己独立的认证体系，不需要租户验证
router.use((req, res, next) => {
  // 跳过 /admin 路由
  if (req.path.startsWith('/admin/')) {
    return next();
  }
  // 跳过支付回调
  if (req.path === '/payments/callback') {
    return next();
  }
  tenantMiddleware(req, res, next);
});

// ======================
// 认证相关 API
// ======================
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.get('/auth/me', AuthController.getCurrentUser);
router.put('/auth/change-password', AuthController.changePassword);

// ======================
// 订单管理 API
// ======================
router.post('/orders', OrderController.create);
router.get('/orders/:id', OrderController.getById);
router.get('/orders', OrderController.list);
router.put('/orders/:id/assign', OrderController.assignOrder);
router.put('/orders/:id/start', OrderController.startOrder);
router.put('/orders/:id/complete', OrderController.completeOrder);
router.put('/orders/:id/cancel', OrderController.cancelOrder);
router.put('/orders/:id', OrderController.updateOrder);

// ======================
// 地图服务 API
// ======================
router.get('/map/search-address', MapController.searchAddress);
router.post('/map/geocode', MapController.geocode);
router.post('/map/reverse-geocode', MapController.reverseGeocode);
router.post('/map/calculate-distance', MapController.calculateDistance);

// 工人位置服务
router.get('/workers/:workerId/location', MapController.getWorkerLocation);
router.put('/workers/location', MapController.updateWorkerLocation);

// 订单轨迹服务
router.get('/orders/:orderId/track', MapController.getOrderTrack);

// ======================
// 财务管理 API
// ======================
router.get('/finance/account', FinanceController.getAccount);
router.post('/finance/withdrawals', FinanceController.requestWithdrawal);
router.get('/finance/withdrawals', FinanceController.getWithdrawalHistory);
router.get('/finance/payments', FinanceController.getPaymentHistory);

// ======================
// 推荐系统 API
// ======================
router.get('/referral/campaigns', ReferralController.getActiveCampaigns);
router.get('/referral/campaigns/:id', ReferralController.getCampaignDetails);
router.get('/referral/stats', ReferralController.getReferralStats);
router.get('/referral/rewards', ReferralController.getRewardHistory);
router.get('/referral/total-rewards', ReferralController.getTotalRewards);
router.post('/referral/generate-link', ReferralController.generateReferralLink);
router.post('/referral/confirm', ReferralController.confirmReferral);

// ======================
// 支付回调（绕过租户中间件）
// ======================
// 注意：此路由必须在 router.use(tenantMiddleware) 之后单独定义，
// 因为它不需要租户上下文（由第三方支付平台调用）
router.post('/payments/callback', FinanceController.paymentCallback);

module.exports = router;