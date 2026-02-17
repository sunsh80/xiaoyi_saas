/**
 * Order 模型扩展 - 财务相关方法
 */
const { getTenantConnection } = require('../middleware/tenant');

/**
 * 获取指定日期范围的 GMV
 */
async function getGMVByDateRange(startDate, endDate, tenantCode) {
  const pool = getTenantConnection(tenantCode);
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as gmv
       FROM orders
       WHERE status = 'completed'
         AND complete_time BETWEEN ? AND ?`,
      [startDate, endDate]
    );
    return parseFloat(rows[0].gmv) || 0;
  } finally {
    connection.release();
  }
}

/**
 * 获取指定月份的 GMV
 */
async function getGMVByMonth(date, tenantCode) {
  const pool = getTenantConnection(tenantCode);
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as gmv
       FROM orders
       WHERE status = 'completed'
         AND YEAR(complete_time) = YEAR(?)
         AND MONTH(complete_time) = MONTH(?)`,
      [date, date]
    );
    return parseFloat(rows[0].gmv) || 0;
  } finally {
    connection.release();
  }
}

/**
 * 获取指定年份的 GMV
 */
async function getGMVByYear(date, tenantCode) {
  const pool = getTenantConnection(tenantCode);
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as gmv
       FROM orders
       WHERE status = 'completed'
         AND YEAR(complete_time) = YEAR(?)`,
      [date]
    );
    return parseFloat(rows[0].gmv) || 0;
  } finally {
    connection.release();
  }
}

/**
 * 获取总服务费收入
 */
async function getTotalServiceFee(tenantCode) {
  const pool = getTenantConnection(tenantCode);
  const connection = await pool.getConnection();
  try {
    // 如果 order_fees 表存在，从该表获取
    try {
      const [rows] = await connection.execute(
        `SELECT COALESCE(SUM(service_fee), 0) as total_fee
         FROM order_fees
         WHERE status = 'completed'`
      );
      return parseFloat(rows[0].total_fee) || 0;
    } catch (error) {
      // 如果 order_fees 表不存在，从订单表估算（假设服务费为订单金额的 5%）
      const [rows] = await connection.execute(
        `SELECT COALESCE(SUM(amount * 0.05), 0) as total_fee
         FROM orders
         WHERE status = 'completed'`
      );
      return parseFloat(rows[0].total_fee) || 0;
    }
  } finally {
    connection.release();
  }
}

module.exports = {
  getGMVByDateRange,
  getGMVByMonth,
  getGMVByYear,
  getTotalServiceFee
};
