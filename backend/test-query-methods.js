/**
 * 测试不同方式的数据库查询
 */
require('dotenv').config({ path: './.env' });
const mysql = require('mysql2/promise');
const { getTenantConnection } = require('./middleware/tenant');

async function testDifferentQueries() {
  console.log('🔍 测试不同方式的数据库查询...');

  try {
    // 获取连接池
    const pool = getTenantConnection('TEST_TENANT');
    const connection = await pool.getConnection();
    
    try {
      // 测试使用字符串拼接LIMIT和OFFSET
      console.log('测试使用字符串拼接LIMIT和OFFSET...');
      const limit = 10;
      const offset = 0;
      const query = `SELECT * FROM orders WHERE tenant_id = ? AND assignee_user_id = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      console.log('执行查询:', query);
      
      const [result] = await connection.execute(query, [5, 5]);
      console.log('字符串拼接查询成功，返回:', result.length, '条记录');
    } finally {
      connection.release();
    }
    
    console.log('✅ 字符串拼接方式查询测试通过');
  } catch (error) {
    console.error('❌ 字符串拼接方式查询测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

testDifferentQueries();