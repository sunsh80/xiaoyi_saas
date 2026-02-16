/**
 * 添加created_by字段到orders表
 */
require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');

async function addCreatedbyField() {
  console.log('🔧 添加created_by字段到orders表...');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'XIAOYI',
      charset: 'utf8mb4'
    });

    // 检查字段是否已存在
    const [existingColumns] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'created_by'",
      [process.env.DB_NAME || 'XIAOYI']
    );

    if (existingColumns.length > 0) {
      console.log('ℹ️ created_by字段已存在');
    } else {
      // 添加created_by字段
      try {
        await connection.execute(
          'ALTER TABLE orders ADD COLUMN created_by BIGINT NULL DEFAULT NULL COMMENT \'创建人ID\' AFTER updated_at'
        );
        console.log('✅ created_by字段添加成功');
      } catch (alterError) {
        console.log('ℹ️ 添加created_by字段时出错（可能已存在）:', alterError.message);
      }
    }

    // 检查所有字段
    const [columns] = await connection.execute('DESCRIBE orders;');
    console.log('\n📋 更新后的orders表字段:');
    const columnNames = columns.map(col => col.Field);
    console.log(columnNames);

    await connection.end();
    console.log('\n✅ 字段添加完成');
  } catch (error) {
    console.error('❌ 添加字段时出错:', error.message);
  }
}

addCreatedbyField();