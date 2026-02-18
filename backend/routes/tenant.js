const express = require('express');
const router = express.Router();
const TenantController = require('../controllers/TenantController');
const AuthController = require('../controllers/AuthController');

// 租户注册路由（公开，无需认证）
router.post('/auth/tenant-register', AuthController.tenantRegister);

// 工人注册路由（公开，无需认证）
router.post('/auth/worker-register', AuthController.workerRegister);

// 租户管理员登录路由
router.post('/auth/tenant-login', AuthController.tenantLogin);

// 公共工人登录路由
router.post('/auth/worker-login', AuthController.publicWorkerLogin);

// 租户管理路由（需要租户中间件）
router.get('/tenant/info', TenantController.getTenantInfo);
router.get('/tenant/dashboard', TenantController.getDashboard);

// 订单管理
router.get('/tenant/orders', TenantController.getOrders);

// 接单人员管理
router.get('/tenant/workers', TenantController.getWorkers);

// 用户管理
router.get('/tenant/users', TenantController.getUsers);

// 财务管理
router.get('/tenant/finance/overview', TenantController.getFinanceOverview);

// 租户设置
router.put('/tenant/settings', TenantController.updateSettings);

module.exports = router;
