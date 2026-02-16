const { getTenantConnection } = require('../middleware/tenant');

class Account {
  static tableName = 'accounts';

  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.tenant_id = data.tenant_id;
    this.account_type = data.account_type;
    this.balance = parseFloat(data.balance) || 0.00;
    this.frozen_amount = parseFloat(data.frozen_amount) || 0.00;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 根据用户ID获取账户
   */
  static async getByUserId(userId) {
    const connection = await getTenantConnection('global'); // 账户信息是全局的
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE user_id = ?`,
        [userId]
      );
      return rows.length > 0 ? new Account(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据租户ID获取账户
   */
  static async getByTenantId(tenantId) {
    const connection = await getTenantConnection('global'); // 账户信息是全局的
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE tenant_id = ?`,
        [tenantId]
      );
      return rows.length > 0 ? new Account(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取平台账户
   */
  static async getPlatformAccount() {
    const connection = await getTenantConnection('global'); // 账户信息是全局的
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE account_type = 'platform' LIMIT 1`
      );
      return rows.length > 0 ? new Account(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 创建账户
   */
  static async create(accountData) {
    const connection = await getTenantConnection('global'); // 账户信息是全局的
    try {
      // 检查是否已存在对应类型的账户
      let checkQuery = `SELECT id FROM ${this.tableName} WHERE `;
      const checkParams = [];

      if (accountData.user_id) {
        checkQuery += 'user_id = ?';
        checkParams.push(accountData.user_id);
      } else if (accountData.tenant_id) {
        checkQuery += 'tenant_id = ?';
        checkParams.push(accountData.tenant_id);
      } else if (accountData.account_type === 'platform') {
        checkQuery += "account_type = 'platform'";
      }

      const [existing] = await connection.execute(checkQuery, checkParams);
      if (existing.length > 0) {
        throw new Error('账户已存在');
      }

      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName} 
        (user_id, tenant_id, account_type, balance, frozen_amount) 
        VALUES (?, ?, ?, ?, ?)`,
        [
          accountData.user_id || null,
          accountData.tenant_id || null,
          accountData.account_type,
          accountData.balance || 0.00,
          accountData.frozen_amount || 0.00
        ]
      );

      return await this.getById(result.insertId);
    } finally {
      connection.release();
    }
  }

  /**
   * 根据ID获取账户
   */
  static async getById(id) {
    const connection = await getTenantConnection('global'); // 账户信息是全局的
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      return rows.length > 0 ? new Account(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 更新账户余额
   */
  async updateBalance(newBalance, tenantCode) {
    const connection = await getTenantConnection('global'); // 账户信息是全局的
    try {
      await connection.execute(
        `UPDATE ${Account.tableName} SET balance = ?, updated_at = NOW() WHERE id = ?`,
        [newBalance, this.id]
      );
      this.balance = parseFloat(newBalance);
    } finally {
      connection.release();
    }
  }

  /**
   * 增加余额
   */
  async increaseBalance(amount, tenantCode) {
    if (amount <= 0) {
      throw new Error('增加金额必须大于0');
    }

    const connection = await getTenantConnection('global'); // 账户信息是全局的
    try {
      await connection.execute(
        `UPDATE ${Account.tableName} SET balance = balance + ?, updated_at = NOW() WHERE id = ?`,
        [amount, this.id]
      );
      this.balance = parseFloat((this.balance + amount).toFixed(2));
    } finally {
      connection.release();
    }
  }

  /**
   * 减少余额
   */
  async decreaseBalance(amount, tenantCode) {
    if (amount <= 0) {
      throw new Error('减少金额必须大于0');
    }

    if (this.balance < amount) {
      throw new Error('余额不足');
    }

    const connection = await getTenantConnection('global'); // 账户信息是全局的
    try {
      await connection.execute(
        `UPDATE ${Account.tableName} SET balance = balance - ?, updated_at = NOW() WHERE id = ?`,
        [amount, this.id]
      );
      this.balance = parseFloat((this.balance - amount).toFixed(2));
    } finally {
      connection.release();
    }
  }

  /**
   * 冻结金额
   */
  async freezeAmount(amount, tenantCode) {
    if (amount <= 0) {
      throw new Error('冻结金额必须大于0');
    }

    if (this.balance < amount) {
      throw new Error('可用余额不足');
    }

    const connection = await getTenantConnection('global'); // 账户信息是全局的
    try {
      await connection.execute(
        `UPDATE ${Account.tableName} SET balance = balance - ?, frozen_amount = frozen_amount + ?, updated_at = NOW() WHERE id = ?`,
        [amount, amount, this.id]
      );
      this.balance = parseFloat((this.balance - amount).toFixed(2));
      this.frozen_amount = parseFloat((this.frozen_amount + amount).toFixed(2));
    } finally {
      connection.release();
    }
  }

  /**
   * 解冻金额
   */
  async unfreezeAmount(amount, tenantCode) {
    if (amount <= 0) {
      throw new Error('解冻金额必须大于0');
    }

    if (this.frozen_amount < amount) {
      throw new Error('冻结金额不足');
    }

    const connection = await getTenantConnection('global'); // 账户信息是全局的
    try {
      await connection.execute(
        `UPDATE ${Account.tableName} SET balance = balance + ?, frozen_amount = frozen_amount - ?, updated_at = NOW() WHERE id = ?`,
        [amount, amount, this.id]
      );
      this.balance = parseFloat((this.balance + amount).toFixed(2));
      this.frozen_amount = parseFloat((this.frozen_amount - amount).toFixed(2));
    } finally {
      connection.release();
    }
  }

  /**
   * 获取账户详情
   */
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      tenant_id: this.tenant_id,
      account_type: this.account_type,
      balance: this.balance,
      frozen_amount: this.frozen_amount,
      available_balance: parseFloat((this.balance - this.frozen_amount).toFixed(2)),
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Account;