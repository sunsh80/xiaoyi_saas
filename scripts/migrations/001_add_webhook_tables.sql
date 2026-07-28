-- ============================================================
-- 迁移脚本 001: 新增 Webhook 相关表
-- 日期: 2026-07-26
-- 说明: 新增 incoming_webhook_logs、webhook_status_mappings 表，
--       扩展 third_party_platforms 表增加 adapter_class 字段
-- ============================================================

-- 1. 新增表：webhook_status_mappings（状态映射配置）
CREATE TABLE IF NOT EXISTS webhook_status_mappings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  platform_code VARCHAR(50) NOT NULL COMMENT '平台编码，如 saas/huolala',
  external_status VARCHAR(50) NOT NULL COMMENT '外部系统状态值',
  external_label VARCHAR(100) COMMENT '外部系统状态中文标签',
  internal_status VARCHAR(50) NOT NULL COMMENT '小蚁内部状态值',
  description VARCHAR(200) COMMENT '说明',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '软删除',
  UNIQUE KEY uk_platform_external (platform_code, external_status)
) COMMENT='Webhook 状态映射配置表';

-- 2. 新增表：incoming_webhook_logs（接收日志）
CREATE TABLE IF NOT EXISTS incoming_webhook_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  platform_code VARCHAR(50) NOT NULL COMMENT '来源平台编码',
  event_type VARCHAR(100) NOT NULL COMMENT '事件类型',
  event_id VARCHAR(100) COMMENT '事件唯一 ID',
  raw_body TEXT NOT NULL COMMENT '原始请求体',
  mapped_order_id INT COMMENT '关联的小蚁订单 ID',
  external_order_no VARCHAR(100) COMMENT '外部订单号',
  external_old_status VARCHAR(50) COMMENT '变更前状态',
  external_new_status VARCHAR(50) COMMENT '变更后状态',
  mapped_status VARCHAR(50) COMMENT '映射后的内部状态',
  processing_status ENUM('success', 'failed', 'ignored') DEFAULT 'success' COMMENT '处理结果',
  error_message TEXT COMMENT '错误信息',
  signature_valid TINYINT(1) DEFAULT 0 COMMENT '签名是否验证通过',
  response_time_ms INT COMMENT '处理耗时（毫秒）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_platform (platform_code),
  INDEX idx_order (mapped_order_id),
  INDEX idx_event_id (event_id),
  INDEX idx_created (created_at)
) COMMENT='外部 Webhook 接收日志表';

-- 3. 扩展表：third_party_platforms 新增 adapter_class 字段
-- 注意：MySQL 8.0 不支持 ADD COLUMN IF NOT EXISTS，需先检查
-- 如果字段已存在会报错，可忽略该错误
ALTER TABLE third_party_platforms
  ADD COLUMN adapter_class VARCHAR(100) DEFAULT NULL
  COMMENT '适配器类名，如 SaasWebhookAdapter' AFTER callback_url;

-- 4. 初始数据：SaaS 状态映射（11 条）
INSERT INTO webhook_status_mappings (platform_code, external_status, external_label, internal_status, description) VALUES
('saas', 'created',         '已创建', 'pending',     'SaaS 已创建 → 待处理'),
('saas', 'pending',         '待调度', 'pending',     'SaaS 待调度 → 待处理'),
('saas', 'pending_claim',   '待接单', 'pending',     'SaaS 待接单 → 待处理'),
('saas', 'claimed',         '已接单', 'assigned',    'SaaS 已接单 → 已分配'),
('saas', 'quoted',          '已报价', 'assigned',    'SaaS 已报价 → 已分配'),
('saas', 'pending_payment', '待支付', 'assigned',    'SaaS 待支付 → 已分配'),
('saas', 'awarded',         '已派单', 'assigned',    'SaaS 已派单 → 已分配'),
('saas', 'in_transit',      '配送中', 'in_progress', 'SaaS 配送中 → 进行中'),
('saas', 'delivered',       '已送达', 'completed',   'SaaS 已送达 → 已完成'),
('saas', 'completed',       '已完成', 'completed',   'SaaS 已完成 → 已完成'),
('saas', 'cancelled',       '已取消', 'cancelled',   'SaaS 已取消 → 已取消')
ON DUPLICATE KEY UPDATE external_label = VALUES(external_label);
