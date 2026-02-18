// 延迟加载 getTenantConnection，避免循环依赖
let _getTenantConnection = null;
function getTenantConnectionLazy() {
  if (!_getTenantConnection) {
    _getTenantConnection = require('../middleware/tenant').getTenantConnection;
  }
  return _getTenantConnection;
}

class Tenant {
  static tableName = 'tenants';

  constructor(data = {}) {
    this.id = data.id;
    this.tenant_code = data.tenant_code;
    this.name = data.name;
    this.contact_person = data.contact_person;
    this.contact_phone = data.contact_phone;
    this.contact_email = data.contact_email;
    this.address = data.address;
    this.logo_url = data.logo_url;
    this.status = data.status;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 根据 ID 查找租户
   */
  static async findById(tenantId) {
    const pool = getTenantConnectionLazy()('global');
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [tenantId]
      );
      return rows.length > 0 ? new Tenant(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据租户编码查找租户
   */
  static async findByCode(tenantCode) {
    const pool = getTenantConnectionLazy()('global');
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE tenant_code = ?`,
        [tenantCode]
      );
      return rows.length > 0 ? new Tenant(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 创建新租户
   */
  static async create(tenantData) {
    const pool = getTenantConnectionLazy()('global');
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName}
        (tenant_code, name, contact_person, contact_phone, contact_email, address, logo_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantData.tenant_code,
          tenantData.name,
          tenantData.contact_person,
          tenantData.contact_phone,
          tenantData.contact_email,
          tenantData.address,
          tenantData.logo_url,
          tenantData.status || 1
        ]
      );

      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  /**
   * 更新租户信息（实例方法）
   */
  async update(updateData, tenantCode = 'global') {
    const pool = getTenantConnectionLazy()(tenantCode);
    const connection = await pool.getConnection();
    try {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (this.hasOwnProperty(key) && key !== 'id' && key !== 'tenant_code') {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      values.push(this.id);

      await connection.execute(
        `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      Object.assign(this, updateData);
    } finally {
      connection.release();
    }
  }

  /**
   * 静态更新方法（通过 ID 更新）
   */
  static async update(tenantId, updateData, tenantCode = 'global') {
    const pool = getTenantConnectionLazy()(tenantCode);
    const connection = await pool.getConnection();
    try {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      });

      values.push(tenantId);

      await connection.execute(
        `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      return true;
    } finally {
      connection.release();
    }
  }

  /**
   * 启用租户
   */
  async enable() {
    const pool = getTenantConnectionLazy()('global');
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `UPDATE ${this.tableName} SET status = 1 WHERE id = ?`,
        [this.id]
      );
      this.status = 1;
    } finally {
      connection.release();
    }
  }

  /**
   * 禁用租户
   */
  async disable() {
    const pool = getTenantConnectionLazy()('global');
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
   * 获取所有租户
   */
  static async findAll(options = {}) {
    const pool = getTenantConnectionLazy()('global');
    const connection = await pool.getConnection();
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];

      if (options.status !== undefined) {
        query += ` WHERE status = ?`;
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
      return rows.map(row => new Tenant(row));
    } finally {
      connection.release();
    }
  }
}

module.exports = Tenant;
