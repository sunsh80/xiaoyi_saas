/**
 * 验证数据库表结构
 */
require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');

async function verifyTableStructure() {
  console.log('🔍 验证orders表结构...');

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

    // 检查是否有其他可能缺失的字段
    const requiredFields = ['id', 'tenant_id', 'order_no', 'customer_name', 'phone', 'address', 'title', 'description', 'pickup_address', 'delivery_address', 'distance', 'weight', 'volume', 'amount', 'status', 'assignee_user_id', 'created_at', 'updated_at', 'created_by'];
    const missingFields = requiredFields.filter(field => !columns.some(col => col.Field === field));
    console.log(`\n🔍 缺失的必需字段:`, missingFields);

    await connection.end();
    console.log('\n✅ 验证完成');
  } catch (error) {
    console.error('❌ 验证过程中出错:', error.message);
  }
}

verifyTableStructure();