// backend/models/WebhookStatusMapping.js

const { getTenantConnection } = require('../middleware/tenant');

class WebhookStatusMapping {
  static tableName = 'webhook_status_mappings';

  constructor(data = {}) {
    this.id = data.id;
    this.platform_code = data.platform_code;
    this.external_status = data.external_status;
    this.external_label = data.external_label;
    this.internal_status = data.internal_status;
    this.description = data.description;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 查找指定平台+外部状态的映射
   * @param {string} platformCode - 平台编码
   * @param {string} externalStatus - 外部状态值
   * @returns {WebhookStatusMapping|null}
   */
  static async findMapping(platformCode, externalStatus) {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName}
         WHERE platform_code = ? AND external_status = ? AND deleted_at IS NULL`,
        [platformCode, externalStatus]
      );
      return rows.length > 0 ? new WebhookStatusMapping(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 查找指定平台的所有映射
   * @param {string} platformCode - 平台编码
   * @returns {WebhookStatusMapping[]}
   */
  static async findByPlatform(platformCode) {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName}
         WHERE platform_code = ? AND deleted_at IS NULL
         ORDER BY id ASC`,
        [platformCode]
      );
      return rows.map(row => new WebhookStatusMapping(row));
    } finally {
      connection.release();
    }
  }
}

module.exports = WebhookStatusMapping;
