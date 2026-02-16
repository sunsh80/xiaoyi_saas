/**
 * 检查数据库表结构
 */
require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');

async function checkTableStructure() {
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

    // 检查表结构
    const [columns] = await connection.execute('DESCRIBE orders;');
    console.log('\n📋 orders表字段:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} (${col.Null}) ${col.Key || ''}`);
    });

    // 检查是否有created_by字段
    const hasCreatedBy = columns.some(col => col.Field === 'created_by');
    console.log(`\n🔍 是否有created_by字段: ${hasCreatedBy}`);

    await connection.end();
    console.log('\n✅ 检查完成');
  } catch (error) {
    console.error('❌ 检查过程中出错:', error.message);
  }
}

checkTableStructure();