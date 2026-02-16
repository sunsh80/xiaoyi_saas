/**
 * 创建工人位置追踪表
 */
const mysql = require('mysql2/promise');

async function createWorkerLocationsTable() {
  console.log('🔧 创建工人位置追踪表...');

  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'xiaoyi_app',
      password: 'xiaoyi_pass_2023',
      database: 'XIAOYI',
      charset: 'utf8mb4'
    });

    // 创建worker_locations表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS worker_locations (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL COMMENT '用户ID',
        tenant_id BIGINT NOT NULL COMMENT '租户ID',
        latitude DECIMAL(10, 8) NOT NULL COMMENT '纬度',
        longitude DECIMAL(11, 8) NOT NULL COMMENT '经度',
        address VARCHAR(500) COMMENT '详细地址',
        accuracy DECIMAL(10, 2) DEFAULT 0 COMMENT '定位精度(米)',
        battery_level INT DEFAULT NULL COMMENT '电量百分比',
        order_id BIGINT DEFAULT NULL COMMENT '关联订单ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_tenant (user_id, tenant_id),
        INDEX idx_order (order_id),
        INDEX idx_updated_at (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工人位置追踪表';
    `;

    await connection.execute(createTableSQL);
    console.log('✅ 工人位置追踪表创建成功');

    await connection.end();
    console.log('✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 创建工人位置追踪表失败:', error.message);
  }
}

createWorkerLocationsTable();