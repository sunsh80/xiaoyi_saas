/**
 * 佣金配置模型
 */
const { getTenantConnection } = require('../middleware/tenant');

class CommissionConfig {
  static tableName = 'system_configs';

  /**
   * 获取所有佣金配置
   */
  static async getAllConfigs(tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE config_key LIKE 'commission%' OR config_key LIKE '%fee%' OR config_key LIKE '%rate%'`
      );

      // 转换为键值对对象
      const config = {};
      rows.forEach(row => {
        config[row.config_key] = row.config_type === 'number' ? parseFloat(row.config_value) : row.config_value;
      });

      return config;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取单个配置项
   */
  static async getConfig(key, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE config_key = ?`,
        [key]
      );

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return row.config_type === 'number' ? parseFloat(row.config_value) : row.config_value;
    } finally {
      connection.release();
    }
  }

  /**
   * 更新配置项
   */
  static async updateConfig(key, value, type = 'number', description = '', userId = null, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO ${this.tableName} (config_key, config_value, config_type, description, updated_by)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           config_value = VALUES(config_value),
           config_type = VALUES(config_type),
           description = VALUES(description),
           updated_by = VALUES(updated_by)`,
        [key, String(value), type, description, userId]
      );

      return true;
    } finally {
      connection.release();
    }
  }

  /**
   * 批量更新配置
   */
  static async updateConfigs(configs, userId = null, tenantCode) {
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const [key, value] of Object.entries(configs)) {
        await connection.execute(
          `INSERT INTO ${this.tableName} (config_key, config_value, config_type, description, updated_by)
           VALUES (?, ?, 'number', ?, ?)
           ON DUPLICATE KEY UPDATE
             config_value = VALUES(config_value),
             updated_by = VALUES(updated_by)`,
          [key, String(value), `佣金配置项：${key}`, userId]
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 计算订单佣金
   */
  static async calculateOrderCommission(orderAmount, tenantCode) {
    const config = await this.getAllConfigs(tenantCode);
    
    const commissionRate = parseFloat(config.commission_rate) || 0.10;
    const serviceFeeRate = parseFloat(config.service_fee_rate) || 0.05;
    const serviceFeeMin = parseFloat(config.service_fee_min) || 5.00;
    const serviceFeeMax = parseFloat(config.service_fee_max) || 100.00;
    const informationFee = parseFloat(config.information_fee) || 2.00;
    const insuranceFeeRate = parseFloat(config.insurance_fee_rate) || 0.01;
    const insuranceFeeMin = parseFloat(config.insurance_fee_min) || 1.00;
    const insuranceFeeMax = parseFloat(config.insurance_fee_max) || 50.00;
    
    // 计算各项费用
    let commissionAmount = orderAmount * commissionRate;
    let serviceFee = orderAmount * serviceFeeRate;
    let insuranceFee = orderAmount * insuranceFeeRate;
    
    // 应用最小最大值限制
    serviceFee = Math.max(serviceFeeMin, Math.min(serviceFee, serviceFeeMax));
    insuranceFee = Math.max(insuranceFeeMin, Math.min(insuranceFee, insuranceFeeMax));
    
    const totalFee = commissionAmount + serviceFee + informationFee + insuranceFee;
    const workerIncome = orderAmount - totalFee;
    
    return {
      order_amount: orderAmount,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      service_fee: serviceFee,
      information_fee: informationFee,
      insurance_fee: insuranceFee,
      total_fee: totalFee,
      worker_income: workerIncome
    };
  }
}

module.exports = CommissionConfig;
