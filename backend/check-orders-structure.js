/**
 * 检查orders表结构
 */
require('dotenv').config({ path: './.env' });
const mysql = require('mysql2/promise');

async function checkOrdersTableStructure() {
  console.log('🔍 检查orders表结构...');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'XIAOYI',
      charset: 'utf8mb4'
    });

    // 查询表结构
    const [columns] = await connection.execute('DESCRIBE orders;');
    console.log('\n📋 orders表结构:');
    console.table(columns);

    // 检查assignee_user_id字段是否存在
    const hasAssigneeField = columns.some(col => col.Field === 'assignee_user_id');
    console.log('\n🔍 assignee_user_id字段存在:', hasAssigneeField);

    await connection.end();
    console.log('\n✅ 检查完成');
  } catch (error) {
    console.error('❌ 检查过程中出错:', error.message);
  }
}

checkOrdersTableStructure();