// backend/models/OrderCallback.js

const { getTenantConnection } = require('../middleware/tenant');

class OrderCallback {
  static tableName = 'order_callbacks';

  constructor(data = {}) {
    this.id = data.id;
    this.order_id = data.order_id;
    this.callback_url = data.callback_url;
    this.event_type = data.event_type;
    this.payload = data.payload;
    this.response_code = data.response_code;
    this.response_body = data.response_body;
    this.status = data.status;
    this.retry_count = data.retry_count;
    this.next_retry_at = data.next_retry_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 创建回调记录
   */
  static async create(callbackData) {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName}
        (order_id, callback_url, event_type, payload, status, retry_count, next_retry_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          callbackData.order_id,
          callbackData.callback_url,
          callbackData.event_type,
          JSON.stringify(callbackData.payload),
          callbackData.status || 'pending',
          callbackData.retry_count || 0,
          callbackData.next_retry_at || null
        ]
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  /**
   * 更新回调记录
   */
  static async update(id, updateData) {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const fields = [];
      const values = [];

      if (updateData.response_code !== undefined) {
        fields.push('response_code = ?');
        values.push(updateData.response_code);
      }
      if (updateData.response_body !== undefined) {
        fields.push('response_body = ?');
        values.push(updateData.response_body);
      }
      if (updateData.status !== undefined) {
        fields.push('status = ?');
        values.push(updateData.status);
      }
      if (updateData.retry_count !== undefined) {
        fields.push('retry_count = ?');
        values.push(updateData.retry_count);
      }
      if (updateData.next_retry_at !== undefined) {
        fields.push('next_retry_at = ?');
        values.push(updateData.next_retry_at);
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

  /**
   * 获取待重试的回调
   */
  static async findPendingRetries(limit = 10) {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName}
         WHERE status = 'pending'
           AND (next_retry_at IS NULL OR next_retry_at <= NOW())
         ORDER BY created_at ASC
         LIMIT ${parseInt(limit)}`,
      );
      return rows.map(row => new OrderCallback(row));
    } finally {
      connection.release();
    }
  }

  /**
   * 根据订单 ID 获取回调历史
   */
  static async findByOrderId(orderId) {
    const pool = getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE order_id = ? ORDER BY created_at DESC`,
        [orderId]
      );
      return rows.map(row => new OrderCallback(row));
    } finally {
      connection.release();
    }
  }
}

module.exports = OrderCallback;
