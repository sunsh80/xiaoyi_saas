const express = require('express');
const router = express.Router();
const AdminFinanceController = require('../controllers/AdminFinanceController');
const AdminReferralController = require('../controllers/AdminReferralController');
const AdminReportController = require('../controllers/AdminReportController');
const AdminTenantController = require('../controllers/AdminTenantController');

// 租户管理路由
router.get('/admin/tenants', AdminTenantController.getTenantList);
router.get('/admin/tenants/pending', AdminTenantController.getPendingTenants);
router.get('/admin/tenants/:id', AdminTenantController.getTenantDetail);
router.put('/admin/tenants/:id/approve', AdminTenantController.approveTenant);
router.put('/admin/tenants/:id/reject', AdminTenantController.rejectTenant);
router.put('/admin/tenants/:id', AdminTenantController.updateTenant);
router.delete('/admin/tenants/:id', AdminTenantController.deleteTenant);
router.put('/admin/tenants/:id/toggle-status', AdminTenantController.toggleTenantStatus);

// 报表统计路由
router.get('/admin/reports/statistics', AdminReportController.getStatistics);

// 财务管理路由
router.get('/admin/finance/overview', AdminFinanceController.getFinanceOverview);

// 佣金配置路由
router.get('/admin/commission/config', AdminFinanceController.getCommissionConfig);
router.put('/admin/commission/config', AdminFinanceController.updateCommissionConfig);

// 订单佣金明细路由
router.get('/admin/orders/:id/commission', AdminFinanceController.getOrderCommission);

// 提现管理路由
router.get('/admin/withdrawals', AdminFinanceController.getWithdrawalList);
router.put('/admin/withdrawals/:id/approve', AdminFinanceController.approveWithdrawal);
router.put('/admin/withdrawals/:id/reject', AdminFinanceController.rejectWithdrawal);
router.put('/admin/withdrawals/:id/processing', AdminFinanceController.processingWithdrawal);

// 佣金管理路由
router.get('/admin/commissions', AdminFinanceController.getCommissionList);
router.get('/admin/commissions/statistics', AdminFinanceController.getCommissionStatistics);

// 系统配置管理路由
router.get('/admin/configs', AdminFinanceController.getSystemConfigs);
router.put('/admin/configs', AdminFinanceController.updateSystemConfig);

// 推荐活动管理路由
router.get('/admin/referral/campaigns', AdminReferralController.getCampaignList);
router.get('/admin/referral/campaigns/:id', AdminReferralController.getCampaignDetail);
router.post('/admin/referral/campaigns', AdminReferralController.createCampaign);
router.put('/admin/referral/campaigns/:id', AdminReferralController.updateCampaign);
router.put('/admin/referral/campaigns/:id/activate', AdminReferralController.activateCampaign);
router.put('/admin/referral/campaigns/:id/pause', AdminReferralController.pauseCampaign);
router.put('/admin/referral/campaigns/:id/end', AdminReferralController.endCampaign);

// 推荐统计和管理路由
router.get('/admin/referral/stats', AdminReferralController.getReferralStats);
router.get('/admin/referral/list', AdminReferralController.getReferralList);

module.exports = router;