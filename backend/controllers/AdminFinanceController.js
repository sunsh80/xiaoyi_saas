/**
 * 管理后台财务控制器
 */
const CommissionConfig = require('../models/CommissionConfig');
const OrderFinance = require('../models/OrderFinance');
const Order = require('../models/Order');
const WithdrawalFinance = require('../models/WithdrawalFinance');
const AccountFinance = require('../models/AccountFinance');

class AdminFinanceController {
  /**
   * 获取财务总览数据
   */
  static async getFinanceOverview(req, res) {
    try {
      const tenantCode = req.tenantCode;

      // 1. 昨日成交金额
      const yesterday = new Date(Date.now() - 86400000);
      const yesterdayGmv = await OrderFinance.getGMVByDateRange(yesterday, new Date(), tenantCode);

      // 2. 月度累计成交金额
      const monthGmv = await OrderFinance.getGMVByMonth(new Date(), tenantCode);

      // 3. 年度累计成交金额
      const yearGmv = await OrderFinance.getGMVByYear(new Date(), tenantCode);

      // 4. 平台服务费收入
      const platformServiceFee = await OrderFinance.getTotalServiceFee(tenantCode);

      // 5. 提现金额
      const withdrawalAmount = await WithdrawalFinance.getTotalWithdrawal(tenantCode);

      // 6. 平台结余
      const platformBalance = await AccountFinance.getPlatformBalance(tenantCode);

      res.json({
        success: true,
        data: {
          overview: {
            yesterday_gmv: yesterdayGmv || 0,
            month_gmv: monthGmv || 0,
            year_gmv: yearGmv || 0,
            platform_service_fee: platformServiceFee || 0,
            withdrawal_amount: withdrawalAmount || 0,
            platform_balance: platformBalance || 0
          },
          formulas: {
            yesterday_gmv: 'SUM(orders.amount) WHERE DATE(complete_time) = 昨日日期 AND status="completed"',
            month_gmv: 'SUM(orders.amount) WHERE MONTH(complete_time) = 本月 AND status="completed"',
            year_gmv: 'SUM(orders.amount) WHERE YEAR(complete_time) = 本年 AND status="completed"',
            platform_service_fee: 'SUM(order_fees.service_fee) WHERE status="completed"',
            withdrawal_amount: 'SUM(withdrawals.amount) WHERE status="completed"',
            platform_balance: 'SUM(accounts.balance) WHERE account_type="platform"'
          },
          updated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('获取财务总览错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取佣金配置
   */
  static async getCommissionConfig(req, res) {
    try {
      const tenantCode = req.tenantCode;
      const config = await CommissionConfig.getAllConfigs(tenantCode);
      
      res.json({
        success: true,
        data: {
          config: config,
          updated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('获取佣金配置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新佣金配置
   */
  static async updateCommissionConfig(req, res) {
    try {
      const tenantCode = req.tenantCode;
      const userId = req.user?.userId;
      const { config } = req.body;
      
      if (!config || typeof config !== 'object') {
        return res.status(400).json({
          success: false,
          message: '配置数据格式错误'
        });
      }
      
      // 验证配置项
      const allowedKeys = [
        'commission_rate',
        'service_fee_rate',
        'service_fee_min',
        'service_fee_max',
        'information_fee',
        'insurance_fee_rate',
        'insurance_fee_min',
        'insurance_fee_max'
      ];
      
      for (const key of Object.keys(config)) {
        if (!allowedKeys.includes(key)) {
          return res.status(400).json({
            success: false,
            message: `不允许的配置项：${key}`
          });
        }
        
        const value = parseFloat(config[key]);
        if (isNaN(value) || value < 0) {
          return res.status(400).json({
            success: false,
            message: `配置项 ${key} 必须是有效的数字`
          });
        }
      }
      
      // 批量更新配置
      await CommissionConfig.updateConfigs(config, userId, tenantCode);
      
      res.json({
        success: true,
        message: '佣金配置更新成功',
        data: {
          config: config,
          updated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('更新佣金配置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取订单佣金明细
   */
  static async getOrderCommission(req, res) {
    try {
      const { id } = req.params;
      const tenantCode = req.tenantCode;
      
      // 获取订单信息
      const order = await Order.findById(id, tenantCode);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: '订单不存在'
        });
      }
      
      // 计算佣金
      const commissionDetails = await CommissionConfig.calculateOrderCommission(
        order.amount,
        tenantCode
      );
      
      res.json({
        success: true,
        data: {
          order_id: order.id,
          order_no: order.order_no,
          order_amount: order.amount,
          commission_details: commissionDetails,
          calculated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('获取订单佣金明细错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取佣金记录列表
   */
  static async getCommissionList(req, res) {
    try {
      const tenantCode = req.tenantCode;
      const { order_id, admin_user_id, page = 1, limit = 10 } = req.query;

      // TODO: 实现佣金记录列表查询
      // 目前返回空列表
      res.json({
        success: true,
        data: {
          commissions: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        }
      });
    } catch (error) {
      console.error('获取佣金列表错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取佣金统计
   */
  static async getCommissionStatistics(req, res) {
    try {
      const tenantCode = req.tenantCode;
      const { start_date, end_date } = req.query;
      
      // 获取日期范围
      const startDate = start_date ? new Date(start_date) : new Date(0);
      const endDate = end_date ? new Date(end_date) : new Date();
      
      // 获取订单列表
      const orders = await Order.getList(
        {
          status: 'completed',
          start_date: startDate,
          end_date: endDate
        },
        { limit: 10000, offset: 0 },
        tenantCode
      );
      
      // 计算统计数据
      let totalOrders = 0;
      let totalAmount = 0;
      let totalCommission = 0;
      let totalServiceFee = 0;
      let totalInformationFee = 0;
      let totalInsuranceFee = 0;
      let totalWorkerIncome = 0;
      
      for (const order of orders.rows) {
        const commission = await CommissionConfig.calculateOrderCommission(
          order.amount,
          tenantCode
        );
        
        totalOrders++;
        totalAmount += order.amount;
        totalCommission += commission.commission_amount;
        totalServiceFee += commission.service_fee;
        totalInformationFee += commission.information_fee;
        totalInsuranceFee += commission.insurance_fee;
        totalWorkerIncome += commission.worker_income;
      }
      
      res.json({
        success: true,
        data: {
          statistics: {
            total_orders: totalOrders,
            total_amount: totalAmount,
            total_commission: totalCommission,
            total_service_fee: totalServiceFee,
            total_information_fee: totalInformationFee,
            total_insurance_fee: totalInsuranceFee,
            total_worker_income: totalWorkerIncome,
            avg_commission_rate: totalAmount > 0 ? (totalCommission / totalAmount) : 0
          },
          period: {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
          },
          calculated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('获取佣金统计错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取提现列表（占位实现）
   */
  static async getWithdrawalList(req, res) {
    res.json({
      success: true,
      data: {
        withdrawals: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      }
    });
  }

  /**
   * 批准提现（占位实现）
   */
  static async approveWithdrawal(req, res) {
    res.json({ success: true, message: '提现申请已批准' });
  }

  /**
   * 拒绝提现（占位实现）
   */
  static async rejectWithdrawal(req, res) {
    res.json({ success: true, message: '提现申请已拒绝' });
  }

  /**
   * 设置提现为处理中（占位实现）
   */
  static async processingWithdrawal(req, res) {
    res.json({ success: true, message: '提现申请已设置为处理中' });
  }

  /**
   * 获取系统配置（占位实现）
   */
  static async getSystemConfigs(req, res) {
    res.json({
      success: true,
      data: {
        configs: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      }
    });
  }

  /**
   * 更新系统配置（占位实现）
   */
  static async updateSystemConfig(req, res) {
    res.json({ success: true, message: '系统配置已更新' });
  }
}

module.exports = AdminFinanceController;
