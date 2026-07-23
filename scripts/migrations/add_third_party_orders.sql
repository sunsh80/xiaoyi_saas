-- 第三方订单 API 数据库迁移脚本
-- 执行时间: 2026-07-24
-- 说明: 添加第三方订单支持字段和表

-- 1. orders 表新增字段
ALTER TABLE orders 
ADD COLUMN source ENUM('app', 'third_party') DEFAULT 'app' COMMENT '订单来源: app-小程序, third_party-第三方' AFTER created_by,
ADD COLUMN third_party_order_no VARCHAR(100) COMMENT '第三方平台订单号' AFTER source,
ADD COLUMN callback_url VARCHAR(500) COMMENT '状态回调地址' AFTER third_party_order_no,
ADD INDEX idx_source (source),
ADD INDEX idx_third_party_order_no (third_party_order_no);

-- 2. 第三方平台配置表
CREATE TABLE IF NOT EXISTS third_party_platforms (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '平台名称',
    code VARCHAR(50) UNIQUE NOT NULL COMMENT '平台编码',
    api_key VARCHAR(100) UNIQUE NOT NULL COMMENT 'API Key',
    api_secret VARCHAR(255) NOT NULL COMMENT 'API Secret (用于签名验证)',
    callback_url VARCHAR(500) COMMENT '默认回调地址',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_api_key (api_key),
    INDEX idx_status (status)
) COMMENT='第三方平台配置表';

-- 3. 订单回调日志表
CREATE TABLE IF NOT EXISTS order_callbacks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL COMMENT '订单ID',
    callback_url VARCHAR(500) NOT NULL COMMENT '回调地址',
    event_type VARCHAR(50) NOT NULL COMMENT '事件类型: status_change/payment/cancel',
    payload JSON NOT NULL COMMENT '回调数据',
    response_code INT COMMENT '响应状态码',
    response_body TEXT COMMENT '响应内容',
    status ENUM('pending', 'success', 'failed') DEFAULT 'pending' COMMENT '回调状态',
    retry_count INT DEFAULT 0 COMMENT '重试次数',
    next_retry_at TIMESTAMP NULL COMMENT '下次重试时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    INDEX idx_order_id (order_id),
    INDEX idx_status (status),
    INDEX idx_next_retry_at (next_retry_at)
) COMMENT='订单回调日志表';

-- 4. 插入示例第三方平台（可选）
-- INSERT INTO third_party_platforms (name, code, api_key, api_secret, callback_url) 
-- VALUES ('测试平台', 'test_platform', 'test_api_key_123', 'test_secret_456', 'https://example.com/callback');
