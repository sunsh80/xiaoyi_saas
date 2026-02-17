/**
 * Withdrawal 模型扩展 - 财务相关方法
 */
const { getTenantConnection } = require('../middleware/tenant');

/**
 * 获取总提现金额
 */
async function getTotalWithdrawal(tenantCode) {
  const pool = getTenantConnection(tenantCode);
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_amount
       FROM withdrawals
       WHERE status = 'completed'`
    );
    return parseFloat(rows[0].total_amount) || 0;
  } finally {
    connection.release();
  }
}

module.exports = {
  getTotalWithdrawal
};
