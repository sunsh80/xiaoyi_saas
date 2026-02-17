/**
 * Account 模型扩展 - 财务相关方法
 */
const { getTenantConnection } = require('../middleware/tenant');

/**
 * 获取平台账户余额
 */
async function getPlatformBalance(tenantCode) {
  const pool = getTenantConnection(tenantCode);
  const connection = await pool.getConnection();
  try {
    // 首先获取默认租户（平台）的 ID
    const [tenants] = await connection.execute(
      `SELECT id FROM tenants WHERE tenant_code = 'default' LIMIT 1`
    );

    if (tenants.length === 0) {
      return 0;
    }

    const platformTenantId = tenants[0].id;

    // 获取平台账户余额
    const [accounts] = await connection.execute(
      `SELECT COALESCE(SUM(balance), 0) as total_balance
       FROM accounts
       WHERE tenant_id = ? AND account_type = 'platform'`,
      [platformTenantId]
    );

    return parseFloat(accounts[0].total_balance) || 0;
  } finally {
    connection.release();
  }
}

module.exports = {
  getPlatformBalance
};
