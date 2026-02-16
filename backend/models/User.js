const { getTenantConnection } = require('../middleware/tenant');

class User {
  static tableName = 'users';

  constructor(data = {}) {
    this.id = data.id;
    this.tenant_id = data.tenant_id;
    this.username = data.username;
    this.password_hash = data.password_hash;
    this.phone = data.phone;
    this.email = data.email;
    this.real_name = data.real_name;
    this.avatar_url = data.avatar_url;
    this.role = data.role;
    this.status = data.status;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 根据ID查找用户
   */
  static async findById(userId, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [userId]
      );
      return rows.length > 0 ? new User(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据用户名查找用户
   */
  static async findByUsername(username, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      // 首先获取租户ID
      const [tenants] = await connection.execute(
        'SELECT id FROM tenants WHERE tenant_code = ?',
        [tenantCode]
      );

      if (tenants.length === 0) {
        return null; // 租户不存在
      }

      const tenantId = tenants[0].id;

      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE username = ? AND tenant_id = ?`,
        [username, tenantId]
      );
      return rows.length > 0 ? new User(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据手机号查找用户
   */
  static async findByPhone(phone, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      // 首先获取租户ID
      const [tenants] = await connection.execute(
        'SELECT id FROM tenants WHERE tenant_code = ?',
        [tenantCode]
      );

      if (tenants.length === 0) {
        return null; // 租户不存在
      }

      const tenantId = tenants[0].id;

      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE phone = ? AND tenant_id = ?`,
        [phone, tenantId]
      );
      return rows.length > 0 ? new User(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 创建新用户
   */
  static async create(userData, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName}
        (tenant_id, username, password_hash, phone, email, real_name, avatar_url, role, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.tenant_id,
          userData.username,
          userData.password_hash,
          userData.phone,
          userData.email,
          userData.real_name,
          userData.avatar_url,
          userData.role,
          userData.status || 1
        ]
      );

      return await this.findById(result.insertId, tenantCode);
    } finally {
      connection.release();
    }
  }

  /**
   * 更新用户信息
   */
  async update(updateData, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (this.hasOwnProperty(key) && key !== 'id') {
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
   * 软删除用户
   */
  async softDelete(tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `UPDATE ${this.tableName} SET status = 0 WHERE id = ?`,
        [this.id]
      );
      this.status = 0;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取租户下的所有用户
   */
  static async findAllByTenant(tenantId, tenantCode, options = {}) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      let query = `SELECT * FROM ${this.tableName} WHERE tenant_id = ?`;
      const params = [tenantId];

      if (options.role) {
        query += ` AND role = ?`;
        params.push(options.role);
      }

      if (options.status !== undefined) {
        query += ` AND status = ?`;
        params.push(options.status);
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
      return rows.map(row => new User(row));
    } finally {
      connection.release();
    }
  }
}

module.exports = User;