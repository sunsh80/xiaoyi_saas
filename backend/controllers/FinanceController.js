const Payment = require('../models/Payment');
const Withdrawal = require('../models/Withdrawal');
const Account = require('../models/Account');
const Order = require('../models/Order');
const Commission = require('../models/Commission');
const SystemConfig = require('../models/SystemConfig');

class FinanceController {
  /**
   * 获取用户账户信息
   */
  static async getAccount(req, res) {
    try {
      const userId = req.user.userId;

      const account = await Account.getByUserId(userId);
      if (!account) {
        return res.status(404).json({
          success: false,
          message: '账户不存在'
        });
      }

      res.json({
        success: true,
        data: {
          account: account.toJSON()
        }
      });
    } catch (error) {
      console.error('获取账户信息错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 发起提现申请
   */
  static async requestWithdrawal(req, res) {
    try {
      const userId = req.user.userId;
      const { amount, account_info, remark } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: '提现金额必须大于0'
        });
      }

      if (!account_info) {
        return res.status(400).json({
          success: false,
          message: '请提供提现账户信息'
        });
      }

      // 创建提现申请
      const withdrawalData = {
        user_id: userId,
        amount: parseFloat(amount),
        account_info: account_info,
        remark: remark || null
      };

      const withdrawal = await Withdrawal.create(withdrawalData);

      res.status(201).json({
        success: true,
        message: '提现申请已提交',
        data: {
          withdrawal: withdrawal.toJSON()
        }
      });
    } catch (error) {
      console.error('提现申请错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '服务器内部错误'
      });
    }
  }

  /**
   * 获取提现记录列表
   */
  static async getWithdrawalHistory(req, res) {
    try {
      const userId = req.user.userId;
      const { status, page = 1, limit = 10 } = req.query;

      const options = {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        status: status || undefined
      };

      const withdrawals = await Withdrawal.getByUserId(userId, options);

      // 获取总数
      const connection = await require('../middleware/tenant').getTenantConnection('global');
      try {
        let countQuery = `SELECT COUNT(*) as count FROM ${Withdrawal.tableName} WHERE user_id = ?`;
        const countParams = [userId];

        if (status) {
          countQuery += ` AND status = ?`;
          countParams.push(status);
        }

        const [countResult] = await connection.execute(countQuery, countParams);
        const totalCount = countResult[0].count;

        res.json({
          success: true,
          data: {
            withdrawals,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: totalCount,
              pages: Math.ceil(totalCount / parseInt(limit))
            }
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('获取提现记录错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取支付记录列表
   */
  static async getPaymentHistory(req, res) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 10, status } = req.query;

      const filters = {
        // 只获取与当前用户相关的支付记录
        $or: [
          { payer_id: userId },
          { payee_id: userId }
        ]
      };

      const options = {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      };

      if (status) {
        filters.status = status;
      }

      const payments = await Payment.getList(filters, options);

      // 获取总数
      const connection = await require('../middleware/tenant').getTenantConnection('global');
      try {
        let countQuery = `SELECT COUNT(*) as count FROM ${Payment.tableName} WHERE (payer_id = ? OR payee_id = ?)`;
        const countParams = [userId, userId];

        if (status) {
          countQuery += ` AND status = ?`;
          countParams.push(status);
        }

        const [countResult] = await connection.execute(countQuery, countParams);
        const totalCount = countResult[0].count;

        res.json({
          success: true,
          data: {
            payments,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: totalCount,
              pages: Math.ceil(totalCount / parseInt(limit))
            }
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('获取支付记录错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 模拟支付回调（实际项目中应由第三方支付平台调用）
   */
  static async paymentCallback(req, res) {
    try {
      const { transaction_no, order_id, status } = req.body;

      if (!transaction_no || !order_id) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数'
        });
      }

      // 查找支付记录
      let payment = await Payment.findByTransactionNo(transaction_no);
      if (!payment) {
        // 如果没有找到交易号对应的记录，尝试用订单ID查找
        payment = await Payment.findByOrderId(order_id);
        if (!payment) {
          return res.status(404).json({
            success: false,
            message: '支付记录不存在'
          });
        }
      }

      if (status === 'success') {
        // 处理支付成功
        await payment.processPaymentSuccess(transaction_no);
        
        // 更新订单状态
        const order = await Order.findById(order_id, req.tenantCode);
        if (order && order.status === 'completed') {
          // 如果订单已完成，计算佣金
          await order.calculateCommission();
        }
      } else if (status === 'failed') {
        // 处理支付失败
        await payment.processPaymentFailure();
      }

      res.json({
        success: true,
        message: '支付回调处理成功'
      });
    } catch (error) {
      console.error('支付回调错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = FinanceController;