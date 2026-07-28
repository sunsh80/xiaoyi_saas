// backend/models/IncomingWebhookLog.js

const { getTenantConnection } = require('../middleware/tenant');

class IncomingWebhookLog {
  static tableName = 'incoming_webhook_logs';

  constructor(data = {}) {
    this.id = data.id;
    this.platform_code = data.platform_code;
    this.event_type = data.event_type;
    this.event_id = data.event_id;
    this.raw_body = data.raw_body;
    this.mapped_order_id = data.mapped_order_id;
    this.external_order_no = data.external_order_no;
    this.external_old_status = data.external_old_status;
    this.external_new_status = data.external_new_status;
    this.mapped_status = data.mapped_status;
    this.processing_status = data.processing_status;
    this.error_message = data.error_message;
    this.signature_valid = data.signature_valid;
    this.response_time_ms = data.response_time_ms;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 创建接收日志
   * @param {object} logData - 日志数据
   * @returns {IncomingWebhookLog}
   */
  static async create(logData) {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName}
         (platform_code, event_type, event_id, raw_body, mapped_order_id,
          external_order_no, external_old_status, external_new_status,
          mapped_status, processing_status, error_message, signature_valid, response_time_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logData.platform_code,
          logData.event_type,
          logData.event_id || null,
          logData.raw_body,
          logData.mapped_order_id || null,
          logData.external_order_no || null,
          logData.external_old_status || null,
          logData.external_new_status || null,
          logData.mapped_status || null,
          logData.processing_status || 'success',
          logData.error_message || null,
          logData.signature_valid ? 1 : 0,
          logData.response_time_ms || null
        ]
      );
      return new IncomingWebhookLog({ ...logData, id: result.insertId });
    } finally {
      connection.release();
    }
  }

  /**
   * 按平台查日志
   * @param {string} platformCode - 平台编码
   * @param {object} options - { page, pageSize }
   * @returns {object} { logs, pagination }
   */
  static async findByPlatform(platformCode, options = {}) {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const page = options.page || 1;
      const pageSize = options.pageSize || 20;
      const offset = (page - 1) * pageSize;

      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName}
         WHERE platform_code = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [platformCode, pageSize, offset]
      );

      const [countRows] = await connection.execute(
        `SELECT COUNT(*) as total FROM ${this.tableName} WHERE platform_code = ?`,
        [platformCode]
      );

      return {
        logs: rows.map(row => new IncomingWebhookLog(row)),
        pagination: {
          page,
          pageSize,
          total: countRows[0].total
        }
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = IncomingWebhookLog;
