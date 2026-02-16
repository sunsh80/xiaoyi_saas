/**
 * 更新worker_locations表结构，添加order_id字段
 */
const mysql = require('mysql2/promise');

async function updateWorkerLocationsTable() {
  console.log('🔧 更新worker_locations表结构，添加order_id字段...');

  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'xiaoyi_app',
      password: 'xiaoyi_pass_2023',
      database: 'XIAOYI',
      charset: 'utf8mb4'
    });

    // 检查order_id字段是否存在
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'XIAOYI' AND TABLE_NAME = 'worker_locations' AND COLUMN_NAME = 'order_id'
    `);

    if (columns.length === 0) {
      // 添加order_id字段
      await connection.execute(`
        ALTER TABLE worker_locations 
        ADD COLUMN order_id BIGINT DEFAULT NULL COMMENT '关联订单ID' AFTER tenant_id,
        ADD INDEX idx_order_id (order_id)
      `);
      console.log('✅ order_id字段添加成功');
    } else {
      console.log('ℹ️ order_id字段已存在');
    }

    await connection.end();
    console.log('✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 更新worker_locations表失败:', error.message);
  }
}

updateWorkerLocationsTable();