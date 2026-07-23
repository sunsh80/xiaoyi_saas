// backend/models/ThirdPartyPlatform.js

const { getTenantConnection } = require('../middleware/tenant');

class ThirdPartyPlatform {
  static tableName = 'third_party_platforms';

  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.code = data.code;
    this.api_key = data.api_key;
    this.api_secret = data.api_secret;
    this.callback_url = data.callback_url;
    this.status = data.status;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 根据 API Key 查找平台
   */
  static async findByApiKey(apiKey) {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE api_key = ? AND status = 1`,
        [apiKey]
      );
      return rows.length > 0 ? new ThirdPartyPlatform(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据 ID 查找平台
   */
  static async findById(id) {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      return rows.length > 0 ? new ThirdPartyPlatform(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据编码查找平台
   */
  static async findByCode(code) {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE code = ?`,
        [code]
      );
      return rows.length > 0 ? new ThirdPartyPlatform(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取所有启用的平台列表
   */
  static async findAll() {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE status = 1 ORDER BY created_at DESC`
      );
      return rows.map(row => new ThirdPartyPlatform(row));
    } finally {
      connection.release();
    }
  }

  /**
   * 创建平台
   */
  static async create(platformData) {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName}
        (name, code, api_key, api_secret, callback_url, status)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          platformData.name,
          platformData.code,
          platformData.api_key,
          platformData.api_secret,
          platformData.callback_url || null,
          platformData.status !== undefined ? platformData.status : 1
        ]
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  /**
   * 更新平台
   */
  static async update(id, updateData) {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const fields = [];
      const values = [];

      if (updateData.name !== undefined) {
        fields.push('name = ?');
        values.push(updateData.name);
      }
      if (updateData.callback_url !== undefined) {
        fields.push('callback_url = ?');
        values.push(updateData.callback_url);
      }
      if (updateData.status !== undefined) {
        fields.push('status = ?');
        values.push(updateData.status);
      }

      if (fields.length === 0) return false;

      values.push(id);
      await connection.execute(
        `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      return true;
    } finally {
      connection.release();
    }
  }
}

module.exports = ThirdPartyPlatform;
