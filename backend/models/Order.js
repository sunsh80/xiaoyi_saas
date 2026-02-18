const { getTenantConnection } = require('../middleware/tenant');

class Order {
  static tableName = 'orders';

  constructor(data = {}) {
    this.id = data.id;
    this.tenant_id = data.tenant_id;
    this.order_no = data.order_no;
    this.title = data.title;
    this.description = data.description;
    this.pickup_address = data.pickup_address;
    this.delivery_address = data.delivery_address;
    this.pickup_time = data.pickup_time;
    this.delivery_time = data.delivery_time;
    this.distance = data.distance;
    this.weight = data.weight;
    this.volume = data.volume;
    this.amount = data.amount;
    this.status = data.status;
    this.assignee_user_id = data.assignee_user_id;
    this.assign_time = data.assign_time;
    this.complete_time = data.complete_time;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 根据 ID 查找订单
   */
  static async findById(orderId, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [orderId]
      );
      return rows.length > 0 ? new Order(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据订单号查找订单
   */
  static async findByOrderNo(orderNo, tenantCode) {
    const connection = await getTenantConnection(tenantCode);
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE order_no = ?`,
        [orderNo]
      );
      return rows.length > 0 ? new Order(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 创建新订单
   */
  static async create(orderData, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      // 生成唯一订单号
      const orderNo = this.generateOrderNo();

      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName}
        (tenant_id, order_no, customer_name, phone, address, title, description, pickup_address, delivery_address,
         pickup_time, delivery_time, distance, weight, volume, amount, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderData.tenant_id,
          orderNo,
          orderData.customer_name,
          orderData.phone,
          orderData.address,
          orderData.title,
          orderData.description || '',
          orderData.pickup_address,
          orderData.delivery_address,
          orderData.pickup_time || null,
          orderData.delivery_time || null,
          orderData.distance || 0,
          orderData.weight || 0,
          orderData.volume || 0,
          orderData.amount || 0,
          orderData.status || 'pending',
          orderData.created_by || null
        ]
      );

      return result.insertId;
    } finally {
      connection.release();
    }
  }

  /**
   * 生成订单号
   */
  static generateOrderNo() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    return `XY${year}${month}${day}${hour}${minute}${second}${randomNum}`;
  }

  /**
   * 分配订单给接单人员
   */
  async assignToWorker(workerUserId, tenantCode) {
    const connection = await getTenantConnection(tenantCode);
    try {
      await connection.execute(
        `UPDATE ${this.tableName}
         SET status = 'assigned', assignee_user_id = ?, assign_time = NOW()
         WHERE id = ?`,
        [workerUserId, this.id]
      );

      this.status = 'assigned';
      this.assignee_user_id = workerUserId;
      this.assign_time = new Date();
    } finally {
      connection.release();
    }
  }

  /**
   * 开始处理订单
   */
  async startProcessing(tenantCode) {
    const connection = await getTenantConnection(tenantCode);
    try {
      await connection.execute(
        `UPDATE ${this.tableName} SET status = 'in_progress' WHERE id = ?`,
        [this.id]
      );

      this.status = 'in_progress';
    } finally {
      connection.release();
    }
  }

  /**
   * 完成订单
   */
  async complete(tenantCode) {
    const connection = await getTenantConnection(tenantCode);
    try {
      await connection.execute(
        `UPDATE ${this.tableName}
         SET status = 'completed', complete_time = NOW()
         WHERE id = ?`,
        [this.id]
      );

      this.status = 'completed';
      this.complete_time = new Date();

      // 订单完成后，触发支付和佣金计算
      await this.handlePaymentAndCommission();
    } finally {
      connection.release();
    }
  }

  /**
   * 处理支付和佣金
   */
  async handlePaymentAndCommission() {
    // 检查是否已存在支付记录
    const Payment = require('./Payment');
    const existingPayment = await Payment.findByOrderId(this.id);

    if (!existingPayment) {
      // 创建支付记录
      const paymentData = {
        order_id: this.id,
        payer_id: this.tenant_id, // 假设租户是付款方
        payee_id: this.assignee_user_id, // 接单人员是收款方
        amount: this.amount,
        payment_method: 'balance', // 默认使用余额支付
        status: 'pending'
      };

      const payment = await Payment.create(paymentData);

      // 如果支付成功，处理佣金
      if (payment.status === 'paid') {
        await this.calculateCommission();
      }
    } else {
      // 如果支付已完成，计算佣金
      if (existingPayment.status === 'paid') {
        await this.calculateCommission();
      }
    }
  }

  /**
   * 计算佣金
   */
  async calculateCommission() {
    const Commission = require('./Commission');

    try {
      // 计算并创建佣金记录
      await Commission.calculateAndCreate(this.id);
      console.log(`订单 ${this.id} 的佣金已计算`);
    } catch (error) {
      console.error(`计算订单 ${this.id} 佣金时出错:`, error);
      // 这里可以添加错误处理逻辑
    }
  }

  /**
   * 取消订单
   */
  async cancel(tenantCode) {
    const connection = await getTenantConnection(tenantCode);
    try {
      await connection.execute(
        `UPDATE ${this.tableName} SET status = 'cancelled' WHERE id = ?`,
        [this.id]
      );

      this.status = 'cancelled';
    } finally {
      connection.release();
    }
  }

  /**
   * 更新订单信息
   */
  async update(updateData, tenantCode) {
    const connection = await getTenantConnection(tenantCode);
    try {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (this.hasOwnProperty(key) && key !== 'id' && key !== 'order_no') {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      values.push(this.id);

      await connection.execute(
        `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      // 更新当前实例
      Object.assign(this, updateData);
    } finally {
      connection.release();
    }
  }

  /**
   * 获取租户下的订单列表
   */
  static async findAllByTenant(tenantId, tenantCode, options = {}) {
    const connection = await getTenantConnection(tenantCode);
    try {
      let query = `SELECT * FROM ${this.tableName} WHERE tenant_id = ?`;
      const params = [tenantId];

      if (options.status) {
        query += ` AND status = ?`;
        params.push(options.status);
      }

      if (options.userId) {
        query += ` AND assignee_user_id = ?`;
        params.push(options.userId);
      }

      query += ` ORDER BY created_at DESC`;

      // 使用字符串拼接 LIMIT 和 OFFSET 以避免参数类型问题
      if (options.limit) {
        const limit = Math.max(1, Math.min(100, parseInt(options.limit) || 10));
        const offset = Math.max(0, parseInt(options.offset) || 0);
        query += ` LIMIT ${limit} OFFSET ${offset}`;
      }

      const [rows] = await connection.execute(query, params);
      return rows.map(row => new Order(row));
    } finally {
      connection.release();
    }
  }

  /**
   * 获取订单列表（通用方法，支持各种筛选条件）
   */
  static async list(conditions = {}, options = {}, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();

    try {
      // 构建查询条件
      let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
      let countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE 1=1`;
      const params = [];
      const countParams = [];

      // 添加租户过滤
      if (conditions.tenant_id) {
        query += ` AND tenant_id = ?`;
        countQuery += ` AND tenant_id = ?`;
        params.push(conditions.tenant_id);
        countParams.push(conditions.tenant_id);
      }

      // 添加租户排除过滤（用于跨租户订单池）
      if (conditions.tenant_id_not) {
        query += ` AND tenant_id != ?`;
        countQuery += ` AND tenant_id != ?`;
        params.push(conditions.tenant_id_not);
        countParams.push(conditions.tenant_id_not);
      }

      // 添加状态过滤
      if (conditions.status) {
        query += ` AND status = ?`;
        countQuery += ` AND status = ?`;
        params.push(conditions.status);
        countParams.push(conditions.status);
      }

      // 添加接单人过滤
      if (conditions.assignee_user_id !== undefined && conditions.assignee_user_id !== null) {
        query += ` AND assignee_user_id = ?`;
        countQuery += ` AND assignee_user_id = ?`;
        params.push(conditions.assignee_user_id);
        countParams.push(conditions.assignee_user_id);
      }

      // 添加排序
      query += ` ORDER BY created_at DESC`;

      // 使用字符串拼接 LIMIT 和 OFFSET 以避免参数类型问题
      const limit = Math.max(1, Math.min(100, parseInt(options.limit) || 10));
      const offset = Math.max(0, parseInt(options.offset) || 0);
      query += ` LIMIT ${limit} OFFSET ${offset}`;

      // 执行查询（不包含 LIMIT 和 OFFSET 参数）
      const [rows] = await connection.execute(query, params);

      // 为计数查询单独执行（使用 countParams，不含 LIMIT 和 OFFSET 参数）
      const [countResult] = await connection.execute(countQuery, countParams);

      return {
        rows: rows.map(row => new Order(row)),
        total: countResult[0].total
      };
    } finally {
      connection.release();
    }
  }

  /**
   * 获取接单人员的订单列表
   */
  static async findByWorker(userId, tenantCode, options = {}) {
    const connection = await getTenantConnection(tenantCode);
    try {
      let query = `SELECT * FROM ${this.tableName} WHERE assignee_user_id = ?`;
      const params = [userId];

      if (options.status) {
        query += ` AND status = ?`;
        params.push(options.status);
      }

      query += ` ORDER BY created_at DESC`;

      // 使用字符串拼接 LIMIT 和 OFFSET 以避免参数类型问题
      if (options.limit) {
        const limit = Math.max(1, Math.min(100, parseInt(options.limit) || 10));
        const offset = Math.max(0, parseInt(options.offset) || 0);
        query += ` LIMIT ${limit} OFFSET ${offset}`;
      }

      const [rows] = await connection.execute(query, params);
      return rows.map(row => new Order(row));
    } finally {
      connection.release();
    }
  }

  /**
   * 获取工人可以查看的订单列表（包括待处理订单和分配给他们的订单）
   */
  static async getOrdersForWorker(workerId, options = {}, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      // 首先获取租户 ID
      const [tenants] = await connection.execute(
        'SELECT id FROM tenants WHERE tenant_code = ?',
        [tenantCode]
      );

      if (tenants.length === 0) {
        return { rows: [], total: 0 }; // 租户不存在
      }

      const tenantId = tenants[0].id;

      let query = `SELECT * FROM ${this.tableName} WHERE tenant_id = ? AND (status = 'pending' OR assignee_user_id = ?)`;
      const params = [tenantId, workerId];

      query += ` ORDER BY created_at DESC`;

      // 使用字符串拼接 LIMIT 和 OFFSET 以避免参数类型问题
      if (options.limit) {
        const limit = Math.max(1, Math.min(100, parseInt(options.limit) || 10));
        const offset = Math.max(0, parseInt(options.offset) || 0);
        query += ` LIMIT ${limit} OFFSET ${offset}`;
      }

      const [rows] = await connection.execute(query, params);

      // 获取总数
      let countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE tenant_id = ? AND (status = 'pending' OR assignee_user_id = ?)`;
      const [countResult] = await connection.execute(countQuery, [tenantId, workerId]);

      return {
        rows: rows.map(row => new Order(row)),
        total: countResult[0].total
      };
    } finally {
      connection.release();
    }
  }

  /**
   * 更新订单信息（静态方法）
   */
  static async update(orderId, updateData, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (key !== 'id' && key !== 'order_no') {  // 不允许更新 ID 和订单号
          fields.push(`${key} = ?`);
          // 确保值是正确的类型，避免 undefined 值
          const value = updateData[key];
          values.push(value !== undefined ? value : null);
        }
      });

      values.push(orderId);  // WHERE 子句参数

      await connection.execute(
        `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      // 返回更新后的订单
      return await this.findById(orderId, tenantCode);
    } finally {
      connection.release();
    }
  }

  /**
   * 根据租户 ID 和日期范围统计订单数量
   */
  static async countByTenantAndDateRange(tenantId, tenantCode, startDate, endDate) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT COUNT(*) as count FROM ${this.tableName} 
         WHERE tenant_id = ? AND created_at BETWEEN ? AND ?`,
        [tenantId, startDate, endDate]
      );
      return { count: rows[0].count || 0 };
    } finally {
      connection.release();
    }
  }

  /**
   * 根据租户 ID 和状态统计订单数量
   */
  static async countByTenantAndStatus(tenantId, status, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT COUNT(*) as count FROM ${this.tableName} 
         WHERE tenant_id = ? AND status = ?`,
        [tenantId, status]
      );
      return { count: rows[0].count || 0 };
    } finally {
      connection.release();
    }
  }

  /**
   * 获取租户下的订单（带限制）
   */
  static async findByTenantWithLimit(tenantId, tenantCode, limit = 5) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} 
         WHERE tenant_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [tenantId, limit]
      );
      return rows.map(row => new Order(row));
    } finally {
      connection.release();
    }
  }

  /**
   * 根据筛选条件获取租户订单（支持分页）
   */
  static async findByTenantWithFilters(tenantId, tenantCode, options = {}) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      let query = `SELECT * FROM ${this.tableName} WHERE tenant_id = ?`;
      const params = [tenantId];

      if (options.status) {
        query += ` AND status = ?`;
        params.push(options.status);
      }

      if (options.start_date) {
        query += ` AND created_at >= ?`;
        params.push(options.start_date);
      }

      if (options.end_date) {
        query += ` AND created_at <= ?`;
        params.push(options.end_date);
      }

      if (options.search) {
        query += ` AND (order_no LIKE ? OR title LIKE ?)`;
        const searchPattern = `%${options.search}%`;
        params.push(searchPattern, searchPattern);
      }

      // 获取总数
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
      const [countResult] = await connection.execute(countQuery, params);
      const total = countResult[0].total;

      // 添加分页和排序
      query += ` ORDER BY created_at DESC`;
      
      if (options.limit) {
        const offset = (options.page - 1) * options.limit;
        query += ` LIMIT ? OFFSET ?`;
        params.push(options.limit, offset);
      }

      const [rows] = await connection.execute(query, params);
      return {
        orders: rows.map(row => new Order(row)),
        total
      };
    } finally {
      connection.release();
    }
  }

  /**
   * 获取订单月度趋势
   */
  static async getMonthlyTrend(tenantId, tenantCode, months = 12) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count 
         FROM ${this.tableName} 
         WHERE tenant_id = ? 
         GROUP BY DATE_FORMAT(created_at, '%Y-%m') 
         ORDER BY month DESC 
         LIMIT ?`,
        [tenantId, months]
      );
      
      // 反转数组以按时间顺序显示
      return rows.reverse().map(row => row.count);
    } finally {
      connection.release();
    }
  }

  /**
   * 获取订单状态分布
   */
  static async getStatusDistribution(tenantId, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT status, COUNT(*) as count 
         FROM ${this.tableName} 
         WHERE tenant_id = ? 
         GROUP BY status`,
        [tenantId]
      );
      
      // 返回状态分布数组
      const statusMap = { 'pending': 0, 'assigned': 0, 'in_progress': 0, 'completed': 0, 'cancelled': 0 };
      rows.forEach(row => {
        statusMap[row.status] = row.count;
      });
      
      return Object.values(statusMap);
    } finally {
      connection.release();
    }
  }

  /**
   * 按日期范围和状态统计订单金额总和
   */
  static async sumAmountByDateRange(tenantId, startDate, endDate, status, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT COALESCE(SUM(amount), 0) as amount 
         FROM ${this.tableName} 
         WHERE tenant_id = ? 
         AND created_at BETWEEN ? AND ?
         AND status = ?`,
        [tenantId, startDate, endDate, status]
      );
      return { amount: rows[0].amount || 0 };
    } finally {
      connection.release();
    }
  }

  /**
   * 按状态统计订单金额总和
   */
  static async sumAmountByStatus(tenantId, status, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT COALESCE(SUM(amount), 0) as amount 
         FROM ${this.tableName} 
         WHERE tenant_id = ? AND status = ?`,
        [tenantId, status]
      );
      return { amount: rows[0].amount || 0 };
    } finally {
      connection.release();
    }
  }

  /**
   * 统计已提现金额
   */
  static async sumWithdrawnAmount(tenantId, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      // 这里简化处理，实际应该从提现表中统计
      return { amount: 0 };
    } finally {
      connection.release();
    }
  }

  /**
   * 统计账户余额
   */
  static async sumAccountBalance(tenantId, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      // 这里简化处理，实际应该从账户表中统计
      return { amount: 0 };
    } finally {
      connection.release();
    }
  }
}

module.exports = Order;
