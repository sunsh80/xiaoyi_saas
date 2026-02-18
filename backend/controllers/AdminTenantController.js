const { getTenantConnection } = require('../middleware/tenant');

/**
 * 总后台租户管理 Controller
 */
class AdminTenantController {
  /**
   * 获取所有租户列表（支持筛选）
   */
  static async getTenantList(req, res) {
    try {
      const { status, search, page = 1, limit = 20 } = req.query;
      
      const pool = getTenantConnection('global');
      const connection = await pool.getConnection();
      
      try {
        let query = `SELECT * FROM tenants WHERE 1=1`;
        let countQuery = `SELECT COUNT(*) as total FROM tenants WHERE 1=1`;
        const params = [];
        const countParams = [];

        // 状态筛选
        if (status !== undefined && status !== '') {
          query += ` AND status = ?`;
          countQuery += ` AND status = ?`;
          params.push(parseInt(status));
          countParams.push(parseInt(status));
        }

        // 搜索
        if (search) {
          query += ` AND (name LIKE ? OR contact_person LIKE ? OR contact_phone LIKE ?)`;
          countQuery += ` AND (name LIKE ? OR contact_person LIKE ? OR contact_phone LIKE ?)`;
          const searchPattern = `%${search}%`;
          params.push(searchPattern, searchPattern, searchPattern);
          countParams.push(searchPattern, searchPattern, searchPattern);
        }

        // 获取总数
        const [countResult] = await connection.execute(countQuery, countParams);
        const total = countResult[0].total;

        // 添加排序和分页
        query += ` ORDER BY created_at DESC`;
        
        if (limit) {
          const offset = (page - 1) * limit;
          query += ` LIMIT ? OFFSET ?`;
          params.push(parseInt(limit), offset);
        }

        const [rows] = await connection.execute(query, params);

        res.json({
          success: true,
          data: rows.map(row => ({
            id: row.id,
            tenant_code: row.tenant_code,
            name: row.name,
            contact_person: row.contact_person,
            contact_phone: row.contact_phone,
            contact_email: row.contact_email,
            address: row.address,
            status: row.status,
            created_at: row.created_at
          })),
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('获取租户列表错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取待审批租户列表
   */
  static async getPendingTenants(req, res) {
    try {
      const pool = getTenantConnection('global');
      const connection = await pool.getConnection();
      
      try {
        const [rows] = await connection.execute(
          `SELECT * FROM tenants WHERE status = 0 ORDER BY created_at DESC`
        );

        res.json({
          success: true,
          data: rows.map(row => ({
            id: row.id,
            tenant_code: row.tenant_code,
            name: row.name,
            contact_person: row.contact_person,
            contact_phone: row.contact_phone,
            contact_email: row.contact_email,
            address: row.address,
            status: row.status,
            created_at: row.created_at
          })),
          total: rows.length
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('获取待审批租户列表错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取租户详情
   */
  static async getTenantDetail(req, res) {
    try {
      const { id } = req.params;
      
      const pool = getTenantConnection('global');
      const connection = await pool.getConnection();
      
      try {
        const [rows] = await connection.execute(
          `SELECT * FROM tenants WHERE id = ?`,
          [id]
        );

        if (rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: '租户不存在'
          });
        }

        const tenant = rows[0];

        // 获取租户下的用户数
        const [userCountResult] = await connection.execute(
          `SELECT COUNT(*) as count FROM users WHERE tenant_id = ?`,
          [id]
        );

        // 获取租户下的订单数
        const [orderCountResult] = await connection.execute(
          `SELECT COUNT(*) as count FROM orders WHERE tenant_id = ?`,
          [id]
        );

        res.json({
          success: true,
          data: {
            ...tenant,
            user_count: userCountResult[0].count,
            order_count: orderCountResult[0].count
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('获取租户详情错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 审批通过租户
   */
  static async approveTenant(req, res) {
    try {
      const { id } = req.params;
      const { tenant_code } = req.body; // 可选：自定义租户编码
      
      const pool = getTenantConnection('global');
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();

        // 检查租户是否存在
        const [tenants] = await connection.execute(
          `SELECT * FROM tenants WHERE id = ?`,
          [id]
        );

        if (tenants.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: '租户不存在'
          });
        }

        const tenant = tenants[0];

        if (tenant.status !== 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: '该租户不在待审批状态'
          });
        }

        // 如果提供了自定义租户编码，检查是否重复
        if (tenant_code && tenant_code !== tenant.tenant_code) {
          const [existing] = await connection.execute(
            `SELECT id FROM tenants WHERE tenant_code = ? AND id != ?`,
            [tenant_code, id]
          );

          if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({
              success: false,
              message: '租户编码已存在'
            });
          }

          // 更新租户编码
          await connection.execute(
            `UPDATE tenants SET tenant_code = ? WHERE id = ?`,
            [tenant_code, id]
          );
        }

        // 更新租户状态为已激活
        await connection.execute(
          `UPDATE tenants SET status = 1 WHERE id = ?`,
          [id]
        );

        // 更新租户管理员用户状态为已激活
        await connection.execute(
          `UPDATE users SET status = 1 WHERE tenant_id = ? AND role = 'tenant_admin'`,
          [id]
        );

        await connection.commit();

        res.json({
          success: true,
          message: '审批通过成功',
          data: {
            id,
            tenant_code: tenant_code || tenant.tenant_code,
            status: 1
          }
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('审批通过租户错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 审批拒绝租户
   */
  static async rejectTenant(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body; // 可选：拒绝原因
      
      const pool = getTenantConnection('global');
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();

        // 检查租户是否存在
        const [tenants] = await connection.execute(
          `SELECT * FROM tenants WHERE id = ?`,
          [id]
        );

        if (tenants.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: '租户不存在'
          });
        }

        const tenant = tenants[0];

        if (tenant.status !== 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: '该租户不在待审批状态'
          });
        }

        // 删除租户管理员用户
        await connection.execute(
          `DELETE FROM users WHERE tenant_id = ? AND role = 'tenant_admin'`,
          [id]
        );

        // 删除租户（或设置为已禁用，根据业务需求）
        // 这里选择软删除：设置 status=2 表示已拒绝
        await connection.execute(
          `UPDATE tenants SET status = 2 WHERE id = ?`,
          [id]
        );

        await connection.commit();

        res.json({
          success: true,
          message: '审批拒绝成功',
          data: {
            id,
            status: 2,
            reason: reason || null
          }
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('审批拒绝租户错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新租户信息
   */
  static async updateTenant(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const pool = getTenantConnection('global');
      const connection = await pool.getConnection();
      
      try {
        const fields = [];
        const values = [];

        Object.keys(updateData).forEach(key => {
          if (key !== 'id' && key !== 'tenant_code') {
            fields.push(`${key} = ?`);
            values.push(updateData[key]);
          }
        });

        if (fields.length === 0) {
          return res.status(400).json({
            success: false,
            message: '没有可更新的字段'
          });
        }

        values.push(id);

        await connection.execute(
          `UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`,
          values
        );

        res.json({
          success: true,
          message: '更新成功'
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('更新租户错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 删除租户
   */
  static async deleteTenant(req, res) {
    try {
      const { id } = req.params;
      
      const pool = getTenantConnection('global');
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();

        // 检查租户是否存在
        const [tenants] = await connection.execute(
          `SELECT * FROM tenants WHERE id = ?`,
          [id]
        );

        if (tenants.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: '租户不存在'
          });
        }

        const tenant = tenants[0];

        // 如果租户下有订单，不允许删除
        const [orderCountResult] = await connection.execute(
          `SELECT COUNT(*) as count FROM orders WHERE tenant_id = ?`,
          [id]
        );

        if (orderCountResult[0].count > 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: '该租户下有订单，无法删除'
          });
        }

        // 删除租户下的用户
        await connection.execute(
          `DELETE FROM users WHERE tenant_id = ?`,
          [id]
        );

        // 删除租户
        await connection.execute(
          `DELETE FROM tenants WHERE id = ?`,
          [id]
        );

        await connection.commit();

        res.json({
          success: true,
          message: '删除成功'
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('删除租户错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 启用/禁用租户
   */
  static async toggleTenantStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body; // 1: 启用，2: 禁用
      
      const pool = getTenantConnection('global');
      const connection = await pool.getConnection();
      
      try {
        // 检查租户是否存在
        const [tenants] = await connection.execute(
          `SELECT * FROM tenants WHERE id = ?`,
          [id]
        );

        if (tenants.length === 0) {
          return res.status(404).json({
            success: false,
            message: '租户不存在'
          });
        }

        // 更新租户状态
        await connection.execute(
          `UPDATE tenants SET status = ? WHERE id = ?`,
          [status, id]
        );

        // 同时更新租户下所有用户的状态
        const userStatus = status === 1 ? 1 : 2;
        await connection.execute(
          `UPDATE users SET status = ? WHERE tenant_id = ?`,
          [userStatus, id]
        );

        res.json({
          success: true,
          message: status === 1 ? '启用成功' : '禁用成功'
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('切换租户状态错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = AdminTenantController;
