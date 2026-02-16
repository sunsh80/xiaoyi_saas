const { getTenantConnection } = require('../middleware/tenant');

class Payment {
  static tableName = 'payments';

  constructor(data = {}) {
    this.id = data.id;
    this.order_id = data.order_id;
    this.payer_id = data.payer_id;
    this.payee_id = data.payee_id;
    this.amount = parseFloat(data.amount) || 0.00;
    this.payment_method = data.payment_method;
    this.transaction_no = data.transaction_no;
    this.status = data.status;
    this.payment_time = data.payment_time;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 根据ID查找支付记录
   */
  static async findById(paymentId) {
    const connection = await getTenantConnection('global'); // 支付记录是全局的
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [paymentId]
      );
      return rows.length > 0 ? new Payment(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据订单ID查找支付记录
   */
  static async findByOrderId(orderId) {
    const connection = await getTenantConnection('global'); // 支付记录是全局的
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE order_id = ?`,
        [orderId]
      );
      return rows.length > 0 ? new Payment(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据第三方交易号查找支付记录
   */
  static async findByTransactionNo(transactionNo) {
    const connection = await getTenantConnection('global'); // 支付记录是全局的
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE transaction_no = ?`,
        [transactionNo]
      );
      return rows.length > 0 ? new Payment(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 创建支付记录
   */
  static async create(paymentData) {
    const connection = await getTenantConnection('global'); // 支付记录是全局的
    try {
      // 检查是否已存在相同的支付记录
      const existingPayment = await this.findByOrderId(paymentData.order_id);
      if (existingPayment) {
        throw new Error('该订单已有支付记录');
      }

      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName} 
        (order_id, payer_id, payee_id, amount, payment_method, transaction_no, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentData.order_id,
          paymentData.payer_id,
          paymentData.payee_id,
          paymentData.amount,
          paymentData.payment_method || 'wechat_pay',
          paymentData.transaction_no || null,
          paymentData.status || 'pending'
        ]
      );

      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  /**
   * 更新支付状态
   */
  async updateStatus(newStatus, transactionNo = null) {
    const connection = await getTenantConnection('global'); // 支付记录是全局的
    try {
      const updates = ['status = ?', 'updated_at = NOW()'];
      const params = [newStatus];

      if (transactionNo) {
        updates.push('transaction_no = ?');
        params.push(transactionNo);
      }

      if (newStatus === 'paid') {
        updates.push('payment_time = NOW()');
      }

      await connection.execute(
        `UPDATE ${Payment.tableName} SET ${updates.join(', ')} WHERE id = ?`,
        [...params, this.id]
      );

      this.status = newStatus;
      if (transactionNo) {
        this.transaction_no = transactionNo;
      }
      if (newStatus === 'paid') {
        this.payment_time = new Date();
      }
    } finally {
      connection.release();
    }
  }

  /**
   * 处理支付成功
   */
  async processPaymentSuccess(transactionNo) {
    if (this.status !== 'pending') {
      throw new Error('支付记录状态异常');
    }

    // 更新支付状态
    await this.updateStatus('paid', transactionNo);

    // 这里可以添加支付成功后的业务逻辑
    // 例如：通知订单系统、更新用户余额等
    console.log(`支付成功: 订单ID ${this.order_id}, 金额 ${this.amount}`);
  }

  /**
   * 处理支付失败
   */
  async processPaymentFailure() {
    if (this.status !== 'pending') {
      throw new Error('支付记录状态异常');
    }

    await this.updateStatus('failed');
    console.log(`支付失败: 订单ID ${this.order_id}`);
  }

  /**
   * 退款处理
   */
  async processRefund() {
    if (this.status !== 'paid') {
      throw new Error('只有已支付的订单才能退款');
    }

    const connection = await getTenantConnection('global'); // 支付记录是全局的
    try {
      await connection.execute(
        `UPDATE ${Payment.tableName} SET status = 'refunded', updated_at = NOW() WHERE id = ?`,
        [this.id]
      );

      this.status = 'refunded';
    } finally {
      connection.release();
    }

    console.log(`已退款: 订单ID ${this.order_id}`);
  }

  /**
   * 获取支付记录列表
   */
  static async getList(filters = {}, options = {}) {
    const connection = await getTenantConnection('global'); // 支付记录是全局的
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];
      const conditions = [];

      if (filters.order_id) {
        conditions.push('order_id = ?');
        params.push(filters.order_id);
      }

      if (filters.payer_id) {
        conditions.push('payer_id = ?');
        params.push(filters.payer_id);
      }

      if (filters.payee_id) {
        conditions.push('payee_id = ?');
        params.push(filters.payee_id);
      }

      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (filters.payment_method) {
        conditions.push('payment_method = ?');
        params.push(filters.payment_method);
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
      return rows.map(row => new Payment(row));
    } finally {
      connection.release();
    }
  }

  /**
   * 获取支付详情
   */
  toJSON() {
    return {
      id: this.id,
      order_id: this.order_id,
      payer_id: this.payer_id,
      payee_id: this.payee_id,
      amount: this.amount,
      payment_method: this.payment_method,
      transaction_no: this.transaction_no,
      status: this.status,
      payment_time: this.payment_time,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Payment;