-- 小蚁搬运平台测试用户创建脚本
-- 创建两个测试登录账户

-- 首先确保在正确的数据库中
USE XIAOYI;

-- 创建租户（如果不存在）
INSERT IGNORE INTO tenants (tenant_code, name, contact_person, contact_phone, email, address, status)
VALUES 
  ('TEST_TENANT', '测试租户', 'Test Admin', '13800138000', 'test@example.com', '测试地址', 1),
  ('DEV_TENANT', '开发租户', 'Dev Admin', '13900139000', 'dev@example.com', '开发地址', 1);

-- 获取租户ID
SET @test_tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'TEST_TENANT' LIMIT 1);
SET @dev_tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'DEV_TENANT' LIMIT 1);

-- 创建测试用户1 - 管理员角色
INSERT IGNORE INTO users (tenant_id, username, password_hash, phone, email, real_name, role, status)
VALUES (
  @test_tenant_id,
  'test_admin',
  '$2a$10$rOzJmZ6djF.vN77BH.Tkqe7v.C49WnGHtU.VjOT.x.W.HLwVQ2H2C',  -- 密码: password123
  '13800138001',
  'test_admin@example.com',
  '测试管理员',
  'admin',
  1
);

-- 创建测试用户2 - 工人角色
INSERT IGNORE INTO users (tenant_id, username, password_hash, phone, email, real_name, role, status)
VALUES (
  @test_tenant_id,
  'test_worker',
  '$2a$10$rOzJmZ6djF.vN77BH.Tkqe7v.C49WnGHtU.VjOT.x.W.HLwVQ2H2C',  -- 密码: password123
  '13800138002',
  'test_worker@example.com',
  '测试工人',
  'worker',
  1
);

-- 创建开发用户1 - 租户用户
INSERT IGNORE INTO users (tenant_id, username, password_hash, phone, email, real_name, role, status)
VALUES (
  @dev_tenant_id,
  'dev_user',
  '$2a$10$rOzJmZ6djF.vN77BH.Tkqe7v.C49WnGHtU.VjOT.x.W.HLwVQ2H2C',  -- 密码: password123
  '13900139001',
  'dev_user@example.com',
  '开发用户',
  'tenant_user',
  1
);

-- 创建开发用户2 - 管理员
INSERT IGNORE INTO users (tenant_id, username, password_hash, phone, email, real_name, role, status)
VALUES (
  @dev_tenant_id,
  'dev_admin',
  '$2a$10$rOzJmZ6djF.vN77BH.Tkqe7v.C49WnGHtU.VjOT.x.W.HLwVQ2H2C',  -- 密码: password123
  '13900139002',
  'dev_admin@example.com',
  '开发管理员',
  'admin',
  1
);

-- 为测试用户创建账户
INSERT IGNORE INTO accounts (user_id, balance, created_at)
SELECT id, 1000.00, NOW() 
FROM users 
WHERE username IN ('test_admin', 'test_worker', 'dev_user', 'dev_admin');

-- 显示创建的用户
SELECT 
  u.id,
  u.username,
  u.phone,
  u.real_name,
  u.role,
  t.name AS tenant_name,
  t.tenant_code
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE u.username LIKE 'test_%' OR u.username LIKE 'dev_%';