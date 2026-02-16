const { getTenantConnection } = require('../middleware/tenant');

class Tenant {
  static tableName = 'tenants';

  constructor(data = {}) {
    this.id = data.id;
    this.tenant_code = data.tenant_code;
    this.name = data.name;
    this.contact_person = data.contact_person;
    this.contact_phone = data.contact_phone;
    this.email = data.email;
    this.address = data.address;
    this.logo_url = data.logo_url;
    this.status = data.status;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 根据ID查找租户
   */
  static async findById(tenantId) {
    // 使用默认连接查询租户信息（因为租户信息是全局的）
    const connection = await getTenantConnection('global'); // 使用全局连接
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
    // 使用默认连接查询租户信息
    const connection = await getTenantConnection('global'); // 使用全局连接
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
    // 使用默认连接创建租户信息
    const connection = await getTenantConnection('global'); // 使用全局连接
    try {
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName} 
        (tenant_code, name, contact_person, contact_phone, email, address, logo_url, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantData.tenant_code,
          tenantData.name,
          tenantData.contact_person,
          tenantData.contact_phone,
          tenantData.email,
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
   * 更新租户信息
   */
  async update(updateData) {
    // 使用默认连接更新租户信息
    const connection = await getTenantConnection('global'); // 使用全局连接
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
      
      // 更新当前实例
      Object.assign(this, updateData);
    } finally {
      connection.release();
    }
  }

  /**
   * 启用租户
   */
  async enable() {
    const connection = await getTenantConnection('global'); // 使用全局连接
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
    const connection = await getTenantConnection('global'); // 使用全局连接
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
    const connection = await getTenantConnection('global'); // 使用全局连接
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