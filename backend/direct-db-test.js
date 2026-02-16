/**
 * 直接测试数据库查询
 */
require('dotenv').config({ path: './.env' });
const mysql = require('mysql2/promise');
const { getTenantConnection } = require('./middleware/tenant');

async function directDbTest() {
  console.log('🔍 直接测试数据库查询...');

  try {
    // 获取连接池
    const pool = getTenantConnection('TEST_TENANT');
    const connection = await pool.getConnection();
    
    try {
      // 测试简单查询
      console.log('测试简单查询...');
      const [simpleResult] = await connection.execute(
        'SELECT COUNT(*) as total FROM orders WHERE tenant_id = ?', [5]
      );
      console.log('简单查询成功，总计:', simpleResult[0].total);

      // 测试带接单人过滤的查询
      console.log('测试带接单人过滤的查询...');
      const [filteredResult] = await connection.execute(
        'SELECT COUNT(*) as total FROM orders WHERE tenant_id = ? AND assignee_user_id = ?', [5, 5]
      );
      console.log('过滤查询成功，总计:', filteredResult[0].total);

      // 测试带LIMIT和OFFSET的查询
      console.log('测试带LIMIT和OFFSET的查询...');
      const [withLimitResult] = await connection.execute(
        'SELECT * FROM orders WHERE tenant_id = ? AND assignee_user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [5, 5, 10, 0]
      );
      console.log('带分页查询成功，返回:', withLimitResult.length, '条记录');
      if (withLimitResult.length > 0) {
        console.log('第一条记录:', withLimitResult[0]);
      }
    } finally {
      connection.release();
    }
    
    console.log('✅ 所有数据库查询测试通过');
  } catch (error) {
    console.error('❌ 数据库查询测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

directDbTest();