const User = require('../models/User');
const Order = require('../models/Order');
const Tenant = require('../models/Tenant');

/**
 * 租户管理 Controller
 * 处理租户管理后台的 API 请求
 */
class TenantController {
  /**
   * 获取租户信息
   */
  static async getTenantInfo(req, res) {
    try {
      const tenantCode = req.tenantCode;
      
      // 从数据库获取租户信息
      const tenant = await Tenant.findByCode(tenantCode);
      
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: '租户不存在'
        });
      }

      res.json({
        success: true,
        data: {
          id: tenant.id,
          code: tenant.code,
          name: tenant.name,
          contact_person: tenant.contact_person,
          contact_phone: tenant.contact_phone,
          contact_email: tenant.contact_email,
          address: tenant.address,
          status: tenant.status,
          created_at: tenant.created_at
        }
      });
    } catch (error) {
      console.error('获取租户信息错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取租户仪表盘数据
   */
  static async getDashboard(req, res) {
    try {
      const tenantId = req.currentTenant.id;
      const tenantCode = req.tenantCode;

      console.log('获取仪表盘数据:', { tenantId, tenantCode });

      // 获取当前月份的起止日期
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      console.log('月份范围:', monthStart, monthEnd);

      // 统计数据 - 使用简化版本
      const pool = require('../middleware/tenant').getTenantConnection(tenantCode);
      const connection = await pool.getConnection();

      try {
        // 本月订单数
        const [monthOrders] = await connection.execute(
          `SELECT COUNT(*) as count FROM orders WHERE tenant_id = ? AND created_at >= ?`,
          [tenantId, monthStart]
        );

        // 已完成订单数
        const [completedOrders] = await connection.execute(
          `SELECT COUNT(*) as count FROM orders WHERE tenant_id = ? AND status = 'completed'`,
          [tenantId]
        );

        // 进行中订单数
        const [inProgressOrders] = await connection.execute(
          `SELECT COUNT(*) as count FROM orders WHERE tenant_id = ? AND status = 'in_progress'`,
          [tenantId]
        );

        // 活跃接单员数
        const [activeWorkers] = await connection.execute(
          `SELECT COUNT(DISTINCT u.id) as count
           FROM users u
           LEFT JOIN orders o ON u.id = o.created_by
           WHERE u.tenant_id = ? AND u.role = 'worker'`,
          [tenantId]
        );

        // 最近订单
        const [recentRows] = await connection.execute(
          `SELECT * FROM orders WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 5`,
          [tenantId]
        );

        // 订单状态分布
        const [statusRows] = await connection.execute(
          `SELECT status, COUNT(*) as count FROM orders WHERE tenant_id = ? GROUP BY status`,
          [tenantId]
        );

        const statusMap = { 'pending': 0, 'assigned': 0, 'in_progress': 0, 'completed': 0, 'cancelled': 0 };
        statusRows.forEach(row => {
          statusMap[row.status] = row.count;
        });

        res.json({
          success: true,
          data: {
            month_orders: monthOrders[0].count || 0,
            completed_orders: completedOrders[0].count || 0,
            in_progress_orders: inProgressOrders[0].count || 0,
            active_workers: activeWorkers[0].count || 0,
            recent_orders: recentRows.map(row => ({
              id: row.order_no,
              title: row.title,
              amount: row.amount,
              status: row.status,
              created_at: row.created_at
            })),
            order_trend: [12, 19, 8, 15, 22, 18, 14, 20, 25, 16, 10, 8],
            order_status: Object.values(statusMap)
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('获取仪表盘数据错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误：' + error.message
      });
    }
  }

  /**
   * 获取订单列表
   */
  static async getOrders(req, res) {
    try {
      const tenantId = req.currentTenant.id;
      const tenantCode = req.tenantCode;
      const { status, start_date, end_date, search, page = 1, limit = 20 } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        start_date,
        end_date,
        search
      };

      const result = await Order.findByTenantWithFilters(tenantId, tenantCode, options);

      res.json({
        success: true,
        data: result.orders.map(o => o.toJSON()),
        pagination: {
          total: result.total,
          page: options.page,
          limit: options.limit,
          pages: Math.ceil(result.total / options.limit)
        }
      });
    } catch (error) {
      console.error('获取订单列表错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取接单人员列表
   */
  static async getWorkers(req, res) {
    try {
      const tenantId = req.currentTenant.id;
      const tenantCode = req.tenantCode;
      const { status, search, page = 1, limit = 20 } = req.query;

      const options = {
        role: 'worker',
        status: status !== '' ? (status === 'active' ? 1 : status === 'rest' ? 1 : 0) : undefined,
        search,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await User.findByTenantWithFilters(tenantId, tenantCode, options);

      res.json({
        success: true,
        data: result.users.map(u => ({
          id: u.id,
          name: u.real_name || u.username,
          phone: u.phone,
          status: u.status === 1 ? 'active' : 'inactive',
          completed_orders: u.completed_orders || 0,
          total_income: u.total_income || 0,
          register_date: u.created_at
        })),
        pagination: {
          total: result.total,
          page: options.page,
          limit: options.limit,
          pages: Math.ceil(result.total / options.limit)
        }
      });
    } catch (error) {
      console.error('获取接单人员列表错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取用户列表
   */
  static async getUsers(req, res) {
    try {
      const tenantId = req.currentTenant.id;
      const tenantCode = req.tenantCode;
      const { role, search, page = 1, limit = 20 } = req.query;

      const options = {
        role: role || undefined,
        search,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await User.findByTenantWithFilters(tenantId, tenantCode, options);

      res.json({
        success: true,
        data: result.users.map(u => ({
          id: u.id,
          username: u.username,
          real_name: u.real_name,
          phone: u.phone,
          role: u.role,
          orders_count: u.orders_count || 0,
          register_date: u.created_at
        })),
        pagination: {
          total: result.total,
          page: options.page,
          limit: options.limit,
          pages: Math.ceil(result.total / options.limit)
        }
      });
    } catch (error) {
      console.error('获取用户列表错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取财务总览
   */
  static async getFinanceOverview(req, res) {
    try {
      const tenantId = req.currentTenant.id;
      const tenantCode = req.tenantCode;

      // 获取昨日、本月、本年的成交金额
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31);

      const [yesterdayGmv, monthGmv, yearGmv, pendingSettlement, withdrawnAmount, accountBalance] = await Promise.all([
        Order.sumAmountByDateRange(tenantId, yesterday, yesterday, 'completed', tenantCode),
        Order.sumAmountByDateRange(tenantId, monthStart, monthEnd, 'completed', tenantCode),
        Order.sumAmountByDateRange(tenantId, yearStart, yearEnd, 'completed', tenantCode),
        Order.sumAmountByStatus(tenantId, 'pending_settlement', tenantCode),
        Order.sumWithdrawnAmount(tenantId, tenantCode),
        Order.sumAccountBalance(tenantId, tenantCode)
      ]);

      res.json({
        success: true,
        data: {
          yesterday_gmv: yesterdayGmv.amount || 0,
          month_gmv: monthGmv.amount || 0,
          year_gmv: yearGmv.amount || 0,
          pending_settlement: pendingSettlement.amount || 0,
          withdrawn_amount: withdrawnAmount.amount || 0,
          account_balance: accountBalance.amount || 0
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
   * 更新租户设置
   */
  static async updateSettings(req, res) {
    try {
      const tenantId = req.currentTenant.id;
      const tenantCode = req.tenantCode;
      const settings = req.body;

      // 更新租户信息
      const updateData = {
        contact_person: settings.contact_person,
        contact_phone: settings.contact_phone,
        contact_email: settings.contact_email,
        address: settings.address
      };

      await Tenant.update(tenantId, updateData, tenantCode);

      // 这里可以添加保存租户配置的逻辑
      // 例如保存到 tenant_settings 表

      res.json({
        success: true,
        message: '设置保存成功'
      });
    } catch (error) {
      console.error('更新设置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = TenantController;
