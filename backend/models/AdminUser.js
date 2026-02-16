const { getTenantConnection } = require('../middleware/tenant');

class AdminUser {
  static tableName = 'admin_users';

  constructor(data = {}) {
    this.id = data.id;
    this.username = data.username;
    this.password_hash = data.password_hash;
    this.email = data.email;
    this.real_name = data.real_name;
    this.role = data.role;
    this.status = data.status;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 根据ID查找管理员用户
   */
  static async findById(adminUserId) {
    const connection = await getTenantConnection('global');
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [adminUserId]
      );
      if (rows.length > 0) {
        return new AdminUser(rows[0]);
      }
      return null;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据用户名查找管理员用户
   */
  static async findByUsername(username) {
    const connection = await getTenantConnection('global');
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE username = ?`,
        [username]
      );
      if (rows.length > 0) {
        return new AdminUser(rows[0]);
      }
      return null;
    } finally {
      connection.release();
    }
  }

  /**
   * 创建管理员用户
   */
  static async create(userData) {
    const connection = await getTenantConnection('global');
    try {
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName} (username, password_hash, email, real_name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [userData.username, userData.password_hash, userData.email, userData.real_name, userData.role, userData.status]
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  /**
   * 更新管理员用户
   */
  static async update(id, updateData) {
    const connection = await getTenantConnection('global');
    try {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      if (fields.length === 0) {
        return false;
      }

      values.push(id);

      const [result] = await connection.execute(
        `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }
}

module.exports = AdminUser;