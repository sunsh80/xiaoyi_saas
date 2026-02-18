/**
 * 管理后台报表统计控制器
 */
const { getTenantConnection } = require('../middleware/tenant');

class AdminReportController {
  /**
   * 获取报表统计数据
   */
  static async getStatistics(req, res) {
    try {
      const tenantCode = req.tenantCode;
      const { start_date, end_date } = req.query;

      // 验证日期参数
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: '缺少开始日期或结束日期参数'
        });
      }

      const connection = await getTenantConnection(tenantCode);
      const conn = await connection.getConnection();
      
      try {
        // 1. 订单统计
        const orderStats = await AdminReportController.getOrderStatistics(conn, start_date, end_date);

        // 2. 用户统计
        const userStats = await AdminReportController.getUserStatistics(conn, start_date, end_date);

        // 3. 工人统计
        const workerStats = await AdminReportController.getWorkerStatistics(conn, start_date, end_date);

        // 4. 租户排行
        const tenantRanking = await AdminReportController.getTenantRanking(conn, start_date, end_date);

        // 5. 订单趋势（按日期分组）
        const orderTrend = await AdminReportController.getOrderTrend(conn, start_date, end_date);

        // 6. 订单状态分布
        const orderStatusDist = await AdminReportController.getOrderStatusDistribution(conn, start_date, end_date);

        res.json({
          success: true,
          data: {
            order_stats: orderStats,
            user_stats: userStats,
            worker_stats: workerStats,
            tenant_ranking: tenantRanking,
            order_trend: orderTrend,
            order_status_distribution: orderStatusDist,
            period: {
              start_date,
              end_date
            }
          }
        });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('获取报表统计错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取订单统计
   */
  static async getOrderStatistics(conn, startDate, endDate) {
    const [rows] = await conn.execute(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'assigned' THEN amount ELSE 0 END), 0) as assigned_amount,
        COALESCE(SUM(CASE WHEN status = 'in_progress' THEN amount ELSE 0 END), 0) as in_progress_amount,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN amount ELSE 0 END), 0) as cancelled_amount
      FROM orders
      WHERE created_at BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    const stats = rows[0];
    
    // 计算环比增长率（与上一个周期比较）
    const prevPeriod = this.getPrevPeriod(startDate, endDate);
    const [prevRows] = await conn.execute(
      `SELECT COUNT(*) as total_orders
       FROM orders
       WHERE created_at BETWEEN ? AND ?`,
      [prevPeriod.start, prevPeriod.end]
    );

    const prevTotal = prevRows[0].total_orders || 0;
    const growthRate = prevTotal > 0 ? ((stats.total_orders - prevTotal) / prevTotal * 100).toFixed(2) : 0;

    return {
      total_orders: stats.total_orders,
      completed_amount: parseFloat(stats.completed_amount),
      pending_amount: parseFloat(stats.pending_amount),
      assigned_amount: parseFloat(stats.assigned_amount),
      in_progress_amount: parseFloat(stats.in_progress_amount),
      cancelled_amount: parseFloat(stats.cancelled_amount),
      growth_rate: parseFloat(growthRate)
    };
  }

  /**
   * 获取用户统计
   */
  static async getUserStatistics(conn, startDate, endDate) {
    const [rows] = await conn.execute(
      `SELECT
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.role = 'tenant_admin' THEN u.id END) as tenant_admins,
        COUNT(DISTINCT CASE WHEN u.role = 'tenant_user' THEN u.id END) as tenant_users,
        COUNT(DISTINCT CASE WHEN u.created_at BETWEEN ? AND ? THEN u.id END) as new_users
      FROM users u`,
      [startDate, endDate]
    );

    const stats = rows[0];

    // 活跃用户（有订单的用户 - 使用 created_by 字段）
    const [activeRows] = await conn.execute(
      `SELECT COUNT(DISTINCT created_by) as active_users
       FROM orders
       WHERE created_at BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    return {
      total_users: stats.total_users,
      tenant_admins: stats.tenant_admins,
      tenant_users: stats.tenant_users,
      new_users: stats.new_users,
      active_users: activeRows[0].active_users || 0
    };
  }

  /**
   * 获取工人统计
   */
  static async getWorkerStatistics(conn, startDate, endDate) {
    const [rows] = await conn.execute(
      `SELECT
        COUNT(DISTINCT w.id) as total_workers,
        COUNT(DISTINCT CASE WHEN w.work_status = 1 THEN w.id END) as active_workers,
        COUNT(DISTINCT CASE WHEN w.work_status = 0 THEN w.id END) as resting_workers
      FROM workers w`
    );

    const stats = rows[0];

    // 活跃接单员（期间有完成订单）
    const [activeRows] = await conn.execute(
      `SELECT COUNT(DISTINCT assignee_user_id) as active_workers
       FROM orders
       WHERE status = 'completed'
         AND assignee_user_id IS NOT NULL
         AND complete_time BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    // 计算工人总收入（从已完成的订单中计算）
    const [incomeRows] = await conn.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_income
       FROM orders
       WHERE status = 'completed'`
    );

    return {
      total_workers: stats.total_workers || 0,
      active_workers: activeRows[0].active_workers || 0,
      resting_workers: (stats.total_workers || 0) - (activeRows[0].active_workers || 0),
      total_income: parseFloat(incomeRows[0].total_income) || 0
    };
  }

  /**
   * 获取租户排行
   */
  static async getTenantRanking(conn, startDate, endDate) {
    const [rows] = await conn.execute(
      `SELECT
        t.id,
        t.name,
        t.tenant_code,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.amount), 0) as total_amount
      FROM tenants t
      LEFT JOIN orders o ON t.id = o.tenant_id
      WHERE o.created_at BETWEEN ? AND ? OR o.id IS NULL
      GROUP BY t.id, t.name, t.tenant_code
      ORDER BY order_count DESC
      LIMIT 10`,
      [startDate, endDate]
    );

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      tenant_code: row.tenant_code,
      order_count: row.order_count,
      total_amount: parseFloat(row.total_amount) || 0
    }));
  }

  /**
   * 获取订单趋势（按日期分组）
   */
  static async getOrderTrend(conn, startDate, endDate) {
    const [rows] = await conn.execute(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount
      FROM orders
      WHERE created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC`,
      [startDate, endDate]
    );

    return rows.map(row => ({
      date: row.date,
      order_count: row.order_count,
      completed_amount: parseFloat(row.completed_amount)
    }));
  }

  /**
   * 获取订单状态分布
   */
  static async getOrderStatusDistribution(conn, startDate, endDate) {
    const [rows] = await conn.execute(
      `SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM orders
      WHERE created_at BETWEEN ? AND ?
      GROUP BY status`,
      [startDate, endDate]
    );

    const distribution = {};
    rows.forEach(row => {
      distribution[row.status] = {
        count: row.count,
        total_amount: parseFloat(row.total_amount)
      };
    });

    return distribution;
  }

  /**
   * 计算上一个周期
   */
  static getPrevPeriod(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - daysDiff);
    
    return {
      start: prevStart.toISOString().split('T')[0],
      end: prevEnd.toISOString().split('T')[0]
    };
  }
}

module.exports = AdminReportController;
