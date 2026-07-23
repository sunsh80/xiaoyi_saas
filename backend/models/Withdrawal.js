const { getTenantConnection } = require('../middleware/tenant');

class Withdrawal {
  static tableName = 'withdrawals';

  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.amount = parseFloat(data.amount) || 0.00;
    this.status = data.status;
    this.bank_name = data.bank_name;
    this.bank_account = data.bank_account;
    this.account_name = data.account_name;
    this.remark = data.remark;
    this.rejection_reason = data.rejection_reason;
    this.processed_by = data.processed_by;
    this.processed_at = data.processed_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async _getConn() {
    const pool = getTenantConnection('global');
    return await pool.getConnection();
  }

  /**
   * 根据ID查找提现记录
   */
  static async findById(withdrawalId) {
    const connection = await this._getConn();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [withdrawalId]
      );
      return rows.length > 0 ? new Withdrawal(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据用户ID获取提现记录
   */
  static async getByUserId(userId, options = {}) {
    const connection = await this._getConn();
    try {
      let query = `SELECT * FROM ${this.tableName} WHERE user_id = ?`;
      const params = [userId];

      if (options.status) {
        query += ` AND status = ?`;
        params.push(options.status);
      }

      query += ` ORDER BY created_at DESC`;

      if (options.limit) {
        const limit = parseInt(options.limit);
        query += ` LIMIT ${limit}`;

        if (options.offset) {
          const offset = parseInt(options.offset);
          query += ` OFFSET ${offset}`;
        }
      }

      const [rows] = await connection.execute(query, params);
      return rows.map(row => new Withdrawal(row));
    } finally {
      connection.release();
    }
  }

  /**
   * 创建提现申请（事务保证冻结+插入的原子性）
   */
  static async create(withdrawalData) {
    const connection = await this._getConn();
    try {
      await connection.beginTransaction();

      // 验证最小提现金额
      const minWithdrawalAmount = await this.getMinWithdrawalAmount();
      if (withdrawalData.amount < minWithdrawalAmount) {
        await connection.rollback();
        throw new Error(`最低提现金额为 ¥${minWithdrawalAmount}`);
      }

      // 检查用户余额是否足够
      const Account = require('./Account');
      const userAccount = await Account.getByUserId(withdrawalData.user_id);
      if (!userAccount) {
        await connection.rollback();
        throw new Error('用户账户不存在');
      }

      if (userAccount.balance < withdrawalData.amount) {
        await connection.rollback();
        throw new Error('账户余额不足');
      }

      // 冻结用户账户中的相应金额
      await userAccount.freezeAmount(withdrawalData.amount);

      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName}
        (user_id, amount, account_info, status, remark)
        VALUES (?, ?, ?, ?, ?)`,
        [
          withdrawalData.user_id,
          withdrawalData.amount,
          JSON.stringify(withdrawalData.account_info),
          'pending',
          withdrawalData.remark || null
        ]
      );

      await connection.commit();
      return await this.findById(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取系统最小提现金额
   */
  static async getMinWithdrawalAmount() {
    const SystemConfig = require('./SystemConfig');
    const config = await SystemConfig.getByKey('min_withdrawal_amount');
    return parseFloat(config ? config.config_value : '10.00');
  }

  /**
   * 处理提现申请 - 通过
   */
  async approve(adminUserId) {
    if (this.status !== 'pending') {
      throw new Error('提现申请状态异常');
    }

    const connection = await Withdrawal._getConn();
    try {
      await connection.execute(
        `UPDATE ${Withdrawal.tableName}
         SET status = 'completed', processed_by = ?, processed_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [adminUserId, this.id]
      );

      const Account = require('./Account');
      const userAccount = await Account.getByUserId(this.user_id);
      if (userAccount) {
        await userAccount.decreaseBalance(this.amount);
      }

      this.status = 'completed';
      this.processed_by = adminUserId;
      this.processed_at = new Date();
    } finally {
      connection.release();
    }
  }

  /**
   * 处理提现申请 - 拒绝
   */
  async reject(remark, adminUserId) {
    if (this.status !== 'pending') {
      throw new Error('提现申请状态异常');
    }

    const connection = await Withdrawal._getConn();
    try {
      await connection.execute(
        `UPDATE ${Withdrawal.tableName}
         SET status = 'rejected', remark = ?, processed_by = ?, processed_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [remark, adminUserId, this.id]
      );

      const Account = require('./Account');
      const userAccount = await Account.getByUserId(this.user_id);
      if (userAccount) {
        await userAccount.unfreezeAmount(this.amount);
      }

      this.status = 'rejected';
      this.remark = remark;
      this.processed_by = adminUserId;
      this.processed_at = new Date();
    } finally {
      connection.release();
    }
  }

  /**
   * 处理提现申请 - 处理中
   */
  async processing(adminUserId) {
    if (this.status !== 'pending') {
      throw new Error('提现申请状态异常');
    }

    const connection = await Withdrawal._getConn();
    try {
      await connection.execute(
        `UPDATE ${Withdrawal.tableName}
         SET status = 'processing', processed_by = ?, processed_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [adminUserId, this.id]
      );

      this.status = 'processing';
      this.processed_by = adminUserId;
      this.processed_at = new Date();
    } finally {
      connection.release();
    }
  }

  /**
   * 获取提现申请列表
   */
  static async getList(filters = {}, options = {}) {
    const connection = await this._getConn();
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];
      const conditions = [];

      if (filters.user_id) {
        conditions.push('user_id = ?');
        params.push(filters.user_id);
      }

      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
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
      return rows.map(row => new Withdrawal(row));
    } finally {
      connection.release();
    }
  }

  /**
   * 获取提现详情
   */
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      amount: this.amount,
      account_info: this.account_info,
      status: this.status,
      remark: this.remark,
      processed_by: this.processed_by,
      processed_at: this.processed_at,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Withdrawal;
