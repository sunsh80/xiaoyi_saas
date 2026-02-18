const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'xiaoyi_banyun_secret_key';

class AuthController {
  /**
   * 生成租户编码
   * 格式：TN + YYYYMMDD + 4 位随机数
   * 例如：TN202602171234
   */
  static generateTenantCode() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `TN${year}${month}${day}${randomNum}`;
  }

  /**
   * 租户注册（创建新租户）
   */
  static async tenantRegister(req, res) {
    try {
      const { 
        tenant_name, 
        contact_person, 
        contact_phone, 
        contact_email,
        address,
        admin_username,
        admin_password,
        admin_real_name
      } = req.body;

      // 验证必填字段
      if (!tenant_name || !contact_person || !contact_phone || !admin_username || !admin_password) {
        return res.status(400).json({
          success: false,
          message: '请填写必填信息'
        });
      }

      // 检查手机号是否已被注册
      const existingTenantPhone = await this.checkTenantPhoneExists(contact_phone);
      if (existingTenantPhone) {
        return res.status(400).json({
          success: false,
          message: '该联系电话已被注册'
        });
      }

      // 生成唯一的租户编码
      let tenantCode = this.generateTenantCode();
      let attempts = 0;
      
      // 确保生成的租户编码唯一（最多尝试 10 次）
      while (attempts < 10) {
        const existingTenant = await Tenant.findByCode(tenantCode);
        if (!existingTenant) {
          break; // 编码可用，退出循环
        }
        // 编码已存在，重新生成
        tenantCode = this.generateTenantCode();
        attempts++;
      }

      if (attempts >= 10) {
        return res.status(500).json({
          success: false,
          message: '生成租户编码失败，请稍后重试'
        });
      }

      // 使用全局连接创建租户
      const pool = require('../middleware/tenant').getTenantConnection('global');
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();

        // 1. 创建租户（状态为待审批）
        const [tenantResult] = await connection.execute(
          `INSERT INTO tenants 
           (tenant_code, name, contact_person, contact_phone, contact_email, address, status)
           VALUES (?, ?, ?, ?, ?, ?, 0)`,  // status=0 表示待审批
          [tenantCode, tenant_name, contact_person, contact_phone, contact_email || null, address || null]
        );

        const tenantId = tenantResult.insertId;

        // 2. 密码加密
        const saltRounds = 10;
        const adminPasswordHash = await bcrypt.hash(admin_password, saltRounds);

        // 3. 创建租户管理员账户（状态为待激活）
        const [userResult] = await connection.execute(
          `INSERT INTO users 
           (tenant_id, username, password_hash, phone, real_name, role, status)
           VALUES (?, ?, ?, ?, ?, 'tenant_admin', 0)`,  // status=0 表示待激活
          [tenantId, admin_username, adminPasswordHash, contact_phone, admin_real_name || contact_person]
        );

        await connection.commit();

        // 注意：不生成 token，因为账户待审批
        res.status(201).json({
          success: true,
          message: '注册申请已提交，请等待总后台审批',
          data: {
            tenant: {
              id: tenantId,
              code: tenantCode,
              name: tenant_name,
              status: 'pending'
            },
            user: {
              id: userResult.insertId,
              username: admin_username,
              real_name: admin_real_name || contact_person
            }
          }
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('租户注册错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 工人注册（加入公共工人池）
   */
  static async workerRegister(req, res) {
    try {
      const { 
        real_name,
        phone, 
        id_card,
        username,
        password,
        skills
      } = req.body;

      // 验证必填字段
      if (!real_name || !phone || !username || !password) {
        return res.status(400).json({
          success: false,
          message: '请填写必填信息'
        });
      }

      // 检查手机号是否已被注册
      const existingUser = await User.findByPhone(phone, 'global');
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '该手机号已被注册'
        });
      }

      // 检查用户名是否已存在
      const existingUsername = await User.findByUsername(username, 'global');
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: '用户名已存在'
        });
      }

      // 使用全局连接创建工人用户
      const pool = require('../middleware/tenant').getTenantConnection('global');
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();

        // 1. 密码加密
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 2. 创建工人账户（tenant_id=null，表示公共工人池）
        const [userResult] = await connection.execute(
          `INSERT INTO users 
           (tenant_id, username, password_hash, phone, real_name, id_card, skills, role, status)
           VALUES (NULL, ?, ?, ?, ?, ?, ?, 'worker', 1)`,  // tenant_id=NULL 表示公共工人
          [username, passwordHash, phone, real_name, id_card || null, skills || null]
        );

        await connection.commit();

        // 3. 生成 JWT token（工人登录后可立即使用）
        const token = jwt.sign(
          {
            userId: userResult.insertId,
            tenantId: null,
            tenantCode: 'public',
            username: username,
            role: 'worker'
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.status(201).json({
          success: true,
          message: '入驻成功',
          data: {
            user: {
              id: userResult.insertId,
              username: username,
              real_name: real_name,
              phone: phone,
              role: 'worker'
            },
            token
          }
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('工人注册错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 检查租户联系电话是否已存在
   */
  static async checkTenantPhoneExists(phone) {
    const pool = require('../middleware/tenant').getTenantConnection('global');
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT id FROM tenants WHERE contact_phone = ?',
        [phone]
      );
      return rows.length > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * 用户注册（在已有租户下）
   */
  static async register(req, res) {
    try {
      const { username, password, phone, email, real_name, role } = req.body;
      const tenantId = req.currentTenant.id;
      const tenantCode = req.tenantCode;

      // 检查用户是否已存在
      const existingUser = await User.findByUsername(username, tenantCode);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '用户名已存在'
        });
      }

      // 检查手机号是否已存在
      const existingPhone = await User.findByPhone(phone, tenantCode);
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: '手机号已被注册'
        });
      }

      // 密码加密
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // 创建新用户
      const newUser = await User.create({
        tenant_id: tenantId,
        username,
        password_hash: passwordHash,
        phone,
        email,
        real_name,
        role: role || 'tenant_user',
        status: 1
      }, tenantCode);

      // 生成 JWT token
      const token = jwt.sign(
        {
          userId: newUser.id,
          tenantId: newUser.tenant_id,
          tenantCode,
          username: newUser.username,
          role: newUser.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            phone: newUser.phone,
            email: newUser.email,
            real_name: newUser.real_name,
            role: newUser.role
          },
          token
        }
      });
    } catch (error) {
      console.error('注册错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 用户登录
   */
  static async login(req, res) {
    try {
      const { username, password } = req.body;
      const tenantCode = req.tenantCode;

      // 验证输入参数
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: '用户名和密码不能为空'
        });
      }

      // 根据用户名查找用户
      let user = await User.findByUsername(username, tenantCode);
      if (!user) {
        user = await User.findByPhone(username, tenantCode);
        if (!user) {
          return res.status(401).json({
            success: false,
            message: '用户名或密码错误'
          });
        }
      }

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      // 检查用户状态
      if (user.status !== 1) {
        return res.status(401).json({
          success: false,
          message: '账户已被禁用或待审批'
        });
      }

      // 生成 JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          tenantId: user.tenant_id,
          tenantCode,
          username: user.username,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            username: user.username,
            phone: user.phone,
            email: user.email,
            real_name: user.real_name,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      console.error('登录错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取当前用户信息
   */
  static async getCurrentUser(req, res) {
    try {
      const user = await User.findById(req.user.userId, req.tenantCode);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            phone: user.phone,
            email: user.email,
            real_name: user.real_name,
            role: user.role,
            created_at: user.created_at
          },
          tenant: req.currentTenant
        }
      });
    } catch (error) {
      console.error('获取用户信息错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 修改密码
   */
  static async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user.userId;
      const tenantCode = req.tenantCode;

      const user = await User.findById(userId, tenantCode);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      const isValidOldPassword = await bcrypt.compare(oldPassword, user.password_hash);
      if (!isValidOldPassword) {
        return res.status(400).json({
          success: false,
          message: '原密码错误'
        });
      }

      if (oldPassword === newPassword) {
        return res.status(400).json({
          success: false,
          message: '新密码不能与原密码相同'
        });
      }

      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      await user.update({ password_hash: newPasswordHash }, tenantCode);

      res.json({
        success: true,
        message: '密码修改成功'
      });
    } catch (error) {
      console.error('修改密码错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 租户管理员登录（用于租户管理后台）
   */
  static async tenantLogin(req, res) {
    try {
      const { username, password } = req.body;
      const tenantCode = req.tenantCode;

      // 验证输入参数
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: '用户名和密码不能为空'
        });
      }

      // 根据用户名查找用户
      let user = await User.findByUsername(username, tenantCode);
      if (!user) {
        user = await User.findByPhone(username, tenantCode);
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      // 检查用户状态
      if (user.status !== 1) {
        return res.status(401).json({
          success: false,
          message: '账户已被禁用或待审批'
        });
      }

      // 检查是否为租户管理员角色
      if (user.role !== 'tenant_admin') {
        return res.status(403).json({
          success: false,
          message: '权限不足：只有租户管理员可以登录管理后台'
        });
      }

      // 生成 JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          tenantId: user.tenant_id,
          tenantCode,
          username: user.username,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            username: user.username,
            phone: user.phone,
            email: user.email,
            real_name: user.real_name,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      console.error('租户管理员登录错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 公共工人登录
   */
  static async publicWorkerLogin(req, res) {
    try {
      const { username, password } = req.body;

      // 验证输入参数
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: '用户名和密码不能为空'
        });
      }

      // 使用全局连接查找工人用户
      const pool = require('../middleware/tenant').getTenantConnection('global');
      const connection = await pool.getConnection();
      
      try {
        // 查找 tenant_id 为 NULL 的工人用户
        const [users] = await connection.execute(
          'SELECT * FROM users WHERE (username = ? OR phone = ?) AND tenant_id IS NULL AND role = "worker"',
          [username, username]
        );

        if (users.length === 0) {
          return res.status(401).json({
            success: false,
            message: '用户名或密码错误'
          });
        }

        const user = users[0];

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
          return res.status(401).json({
            success: false,
            message: '用户名或密码错误'
          });
        }

        // 检查用户状态
        if (user.status !== 1) {
          return res.status(401).json({
            success: false,
            message: '账户已被禁用'
          });
        }

        // 生成 JWT token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
          {
            userId: user.id,
            tenantId: null,
            tenantCode: 'public',
            username: user.username,
            role: 'worker'
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          success: true,
          message: '登录成功',
          data: {
            user: {
              id: user.id,
              username: user.username,
              phone: user.phone,
              real_name: user.real_name,
              role: 'worker'
            },
            token
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('公共工人登录错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = AuthController;
