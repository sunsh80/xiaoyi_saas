const { getTenantConnection } = require('../middleware/tenant');

class Commission {
  static tableName = 'commissions';

  constructor(data = {}) {
    this.id = data.id;
    this.order_id = data.order_id;
    this.admin_user_id = data.admin_user_id;
    this.commission_rate = parseFloat(data.commission_rate) || 0;
    this.commission_amount = parseFloat(data.commission_amount) || 0.00;
    this.platform_revenue = parseFloat(data.platform_revenue) || 0.00;
    this.description = data.description;
    this.created_at = data.created_at;
  }

  /**
   * 根据ID查找佣金记录
   */
  static async findById(commissionId) {
    const connection = await getTenantConnection('global'); // 佣金记录是全局的
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [commissionId]
      );
      return rows.length > 0 ? new Commission(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据订单ID查找佣金记录
   */
  static async findByOrderId(orderId) {
    const connection = await getTenantConnection('global'); // 佣金记录是全局的
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE order_id = ?`,
        [orderId]
      );
      return rows.length > 0 ? new Commission(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 计算并创建佣金记录
   */
  static async calculateAndCreate(orderId, adminUserId, customRate = null) {
    const connection = await getTenantConnection('global'); // 佣金记录是全局的
    try {
      // 获取订单信息
      const Order = require('./Order');
      const order = await Order.findById(orderId, 'global'); // 使用全局连接获取订单
      if (!order) {
        throw new Error('订单不存在');
      }

      // 获取抽佣比例
      let commissionRate = customRate;
      if (!customRate) {
        const SystemConfig = require('./SystemConfig');
        const rateConfig = await SystemConfig.getByKey('commission_rate');
        commissionRate = rateConfig ? parseFloat(rateConfig.config_value) : 0.10; // 默认10%
      }

      // 计算佣金
      const commissionAmount = parseFloat((order.amount * commissionRate).toFixed(2));
      const platformRevenue = commissionAmount; // 平台收入等于佣金金额

      // 检查是否已存在佣金记录
      const existingCommission = await this.findByOrderId(orderId);
      if (existingCommission) {
        throw new Error('该订单已存在佣金记录');
      }

      // 创建佣金记录
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName} 
        (order_id, admin_user_id, commission_rate, commission_amount, platform_revenue, description) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          adminUserId || null,
          commissionRate,
          commissionAmount,
          platformRevenue,
          `订单 ${order.order_no} 的抽佣，比例 ${commissionRate * 100}%`
        ]
      );

      // 更新平台账户余额
      const Account = require('./Account');
      let platformAccount = await Account.getPlatformAccount();
      if (!platformAccount) {
        // 如果平台账户不存在，创建一个
        platformAccount = await Account.create({
          account_type: 'platform',
          balance: platformRevenue
        });
      } else {
        // 增加平台账户余额
        await platformAccount.increaseBalance(platformRevenue);
      }

      // 从接单人员账户扣除佣金后的金额
      if (order.assignee_user_id) {
        const workerAccount = await Account.getByUserId(order.assignee_user_id);
        if (workerAccount) {
          const workerEarnings = parseFloat((order.amount - commissionAmount).toFixed(2));
          // 这里假设接单人员的收入是订单金额减去佣金
          // 实际业务中可能有不同的计算方式
        }
      }

      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  /**
   * 获取系统抽佣比例
   */
  static async getCommissionRate() {
    const SystemConfig = require('./SystemConfig');
    const config = await SystemConfig.getByKey('commission_rate');
    return config ? parseFloat(config.config_value) : 0.10; // 默认10%
  }

  /**
   * 更新抽佣比例
   */
  static async updateCommissionRate(newRate, adminUserId) {
    const SystemConfig = require('./SystemConfig');
    await SystemConfig.updateValue('commission_rate', newRate.toFixed(4), adminUserId);
    
    console.log(`抽佣比例已更新为: ${(newRate * 100).toFixed(2)}%`);
  }

  /**
   * 获取佣金记录列表
   */
  static async getList(filters = {}, options = {}) {
    const connection = await getTenantConnection('global'); // 佣金记录是全局的
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];
      const conditions = [];

      if (filters.order_id) {
        conditions.push('order_id = ?');
        params.push(filters.order_id);
      }

      if (filters.admin_user_id) {
        conditions.push('admin_user_id = ?');
        params.push(filters.admin_user_id);
      }

      if (filters.start_date) {
        conditions.push('created_at >= ?');
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        conditions.push('created_at <= ?');
        params.push(filters.end_date);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY created_at DESC`;

      if (options.limit) {
        query += ` LIMIT ?`;
        params.push(options.limit);

        if (options.offset) {
          query += ` OFFSET ?`;
          params.push(options.offset);
        }
      }

      const [rows] = await connection.execute(query, params);
      return rows.map(row => new Commission(row));
    } finally {
      connection.release();
    }
  }

  /**
   * 获取佣金统计
   */
  static async getStatistics(startDate = null, endDate = null) {
    const connection = await getTenantConnection('global'); // 佣金记录是全局的
    try {
      let query = `SELECT 
        COUNT(*) as total_orders,
        SUM(commission_amount) as total_commission,
        SUM(platform_revenue) as total_revenue,
        AVG(commission_rate) as avg_rate
      FROM ${this.tableName}`;
      const params = [];

      if (startDate || endDate) {
        query += ' WHERE ';
        if (startDate) {
          query += 'created_at >= ?';
          params.push(startDate);
          if (endDate) {
            query += ' AND ';
          }
        }
        if (endDate) {
          query += 'created_at <= ?';
          params.push(endDate);
        }
      }

      const [rows] = await connection.execute(query, params);
      return rows[0];
    } finally {
      connection.release();
    }
  }

  /**
   * 获取佣金详情
   */
  toJSON() {
    return {
      id: this.id,
      order_id: this.order_id,
      admin_user_id: this.admin_user_id,
      commission_rate: this.commission_rate,
      commission_amount: this.commission_amount,
      platform_revenue: this.platform_revenue,
      description: this.description,
      created_at: this.created_at
    };
  }
}

module.exports = Commission;