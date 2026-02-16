const Withdrawal = require('../models/Withdrawal');
const Commission = require('../models/Commission');
const SystemConfig = require('../models/SystemConfig');
const AdminUser = require('../models/AdminUser'); // 假设存在管理员用户模型

class AdminFinanceController {
  /**
   * 获取提现申请列表
   */
  static async getWithdrawalList(req, res) {
    try {
      const { status, user_id, page = 1, limit = 10, start_date, end_date } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (user_id) filters.user_id = user_id;
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;

      const options = {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      };

      const withdrawals = await Withdrawal.getList(filters, options);

      // 获取总数
      const connection = await require('../middleware/tenant').getTenantConnection('global');
      try {
        let countQuery = `SELECT COUNT(*) as count FROM ${Withdrawal.tableName} WHERE 1=1`;
        const countParams = [];

        if (status) {
          countQuery += ` AND status = ?`;
          countParams.push(status);
        }
        if (user_id) {
          countQuery += ` AND user_id = ?`;
          countParams.push(user_id);
        }
        if (start_date) {
          countQuery += ` AND created_at >= ?`;
          countParams.push(start_date);
        }
        if (end_date) {
          countQuery += ` AND created_at <= ?`;
          countParams.push(end_date);
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
      console.error('获取提现列表错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 处理提现申请 - 通过
   */
  static async approveWithdrawal(req, res) {
    try {
      const withdrawalId = req.params.id;
      const adminUserId = req.user.userId; // 假设管理员用户ID存储在req.user中

      const withdrawal = await Withdrawal.findById(withdrawalId);
      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          message: '提现申请不存在'
        });
      }

      // 执行批准操作
      await withdrawal.approve(adminUserId);

      res.json({
        success: true,
        message: '提现申请已批准',
        data: {
          withdrawal: withdrawal.toJSON()
        }
      });
    } catch (error) {
      console.error('批准提现申请错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '服务器内部错误'
      });
    }
  }

  /**
   * 处理提现申请 - 拒绝
   */
  static async rejectWithdrawal(req, res) {
    try {
      const withdrawalId = req.params.id;
      const adminUserId = req.user.userId;
      const { remark } = req.body;

      const withdrawal = await Withdrawal.findById(withdrawalId);
      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          message: '提现申请不存在'
        });
      }

      // 执行拒绝操作
      await withdrawal.reject(remark || '管理员拒绝', adminUserId);

      res.json({
        success: true,
        message: '提现申请已拒绝',
        data: {
          withdrawal: withdrawal.toJSON()
        }
      });
    } catch (error) {
      console.error('拒绝提现申请错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '服务器内部错误'
      });
    }
  }

  /**
   * 处理提现申请 - 设为处理中
   */
  static async processingWithdrawal(req, res) {
    try {
      const withdrawalId = req.params.id;
      const adminUserId = req.user.userId;

      const withdrawal = await Withdrawal.findById(withdrawalId);
      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          message: '提现申请不存在'
        });
      }

      // 执行处理中操作
      await withdrawal.processing(adminUserId);

      res.json({
        success: true,
        message: '提现申请状态已更新为处理中',
        data: {
          withdrawal: withdrawal.toJSON()
        }
      });
    } catch (error) {
      console.error('更新提现申请状态错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '服务器内部错误'
      });
    }
  }

  /**
   * 获取佣金记录列表
   */
  static async getCommissionList(req, res) {
    try {
      const { order_id, admin_user_id, page = 1, limit = 10, start_date, end_date } = req.query;

      const filters = {};
      if (order_id) filters.order_id = order_id;
      if (admin_user_id) filters.admin_user_id = admin_user_id;
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;

      const options = {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      };

      const commissions = await Commission.getList(filters, options);

      // 获取总数
      const connection = await require('../middleware/tenant').getTenantConnection('global');
      try {
        let countQuery = `SELECT COUNT(*) as count FROM ${Commission.tableName} WHERE 1=1`;
        const countParams = [];

        if (order_id) {
          countQuery += ` AND order_id = ?`;
          countParams.push(order_id);
        }
        if (admin_user_id) {
          countQuery += ` AND admin_user_id = ?`;
          countParams.push(admin_user_id);
        }
        if (start_date) {
          countQuery += ` AND created_at >= ?`;
          countParams.push(start_date);
        }
        if (end_date) {
          countQuery += ` AND created_at <= ?`;
          countParams.push(end_date);
        }

        const [countResult] = await connection.execute(countQuery, countParams);
        const totalCount = countResult[0].count;

        res.json({
          success: true,
          data: {
            commissions,
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
      console.error('获取佣金记录错误:', error);
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
      const { start_date, end_date } = req.query;

      const statistics = await Commission.getStatistics(start_date, end_date);

      res.json({
        success: true,
        data: {
          statistics
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
   * 获取系统配置
   */
  static async getSystemConfigs(req, res) {
    try {
      const configs = await SystemConfig.getAllConfigs();

      res.json({
        success: true,
        data: {
          configs
        }
      });
    } catch (error) {
      console.error('获取系统配置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新系统配置
   */
  static async updateSystemConfig(req, res) {
    try {
      const { config_key, config_value } = req.body;
      const adminUserId = req.user.userId;

      if (!config_key || config_value === undefined) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数'
        });
      }

      // 特殊处理佣金比例更新
      if (config_key === 'commission_rate') {
        const newRate = parseFloat(config_value);
        if (isNaN(newRate) || newRate < 0 || newRate > 1) {
          return res.status(400).json({
            success: false,
            message: '佣金比例必须是0到1之间的数值'
          });
        }

        // 更新佣金比例
        await Commission.updateCommissionRate(newRate, adminUserId);
      }

      // 更新配置
      const success = await SystemConfig.updateValue(config_key, config_value, adminUserId);

      if (success) {
        res.json({
          success: true,
          message: '配置更新成功'
        });
      } else {
        res.status(500).json({
          success: false,
          message: '配置更新失败'
        });
      }
    } catch (error) {
      console.error('更新系统配置错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '服务器内部错误'
      });
    }
  }
}

module.exports = AdminFinanceController;