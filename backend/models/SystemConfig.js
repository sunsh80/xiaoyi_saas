const { getTenantConnection } = require('../middleware/tenant');

class SystemConfig {
  static tableName = 'system_configs';

  constructor(data = {}) {
    this.id = data.id;
    this.config_key = data.config_key;
    this.config_value = data.config_value;
    this.description = data.description;
    this.updated_by = data.updated_by;
    this.updated_at = data.updated_at;
  }

  /**
   * 根据键名获取配置
   */
  static async getByKey(key) {
    const connection = await getTenantConnection('global'); // 系统配置是全局的
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE config_key = ?`,
        [key]
      );
      return rows.length > 0 ? new SystemConfig(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 更新配置值
   */
  static async updateValue(key, value, updatedBy = null) {
    const connection = await getTenantConnection('global'); // 系统配置是全局的
    try {
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName} (config_key, config_value, updated_by) 
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         config_value = VALUES(config_value), 
         updated_by = VALUES(updated_by), 
         updated_at = NOW()`,
        [key, value, updatedBy]
      );

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取所有配置
   */
  static async getAllConfigs() {
    const connection = await getTenantConnection('global'); // 系统配置是全局的
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} ORDER BY config_key`
      );
      return rows.map(row => new SystemConfig(row));
    } finally {
      connection.release();
    }
  }

  /**
   * 添加或更新配置
   */
  static async setConfig(key, value, description, updatedBy = null) {
    const connection = await getTenantConnection('global'); // 系统配置是全局的
    try {
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName} (config_key, config_value, description, updated_by) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         config_value = VALUES(config_value), 
         description = VALUES(description),
         updated_by = VALUES(updated_by), 
         updated_at = NOW()`,
        [key, value, description, updatedBy]
      );

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * 删除配置
   */
  static async deleteConfig(key) {
    const connection = await getTenantConnection('global'); // 系统配置是全局的
    try {
      const [result] = await connection.execute(
        `DELETE FROM ${this.tableName} WHERE config_key = ?`,
        [key]
      );

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取配置值
   */
  getValue() {
    try {
      // 尝试解析JSON，如果不是JSON则直接返回字符串
      return JSON.parse(this.config_value);
    } catch (e) {
      // 如果不是JSON格式，返回原始字符串
      return this.config_value;
    }
  }

  /**
   * 获取配置详情
   */
  toJSON() {
    return {
      id: this.id,
      config_key: this.config_key,
      config_value: this.getValue(),
      description: this.description,
      updated_by: this.updated_by,
      updated_at: this.updated_at
    };
  }
}

module.exports = SystemConfig;