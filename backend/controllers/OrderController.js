// backend/controllers/OrderController.js

const Order = require('../models/Order');
const User = require('../models/User');

class OrderController {
  // 创建订单
  static async create(req, res) {
    try {
      const { customer_name, phone, address, items, notes } = req.body;
      const tenantCode = req.tenantCode;

      if (!customer_name || !phone || !address) {
        return res.status(400).json({ success: false, message: '客户姓名、电话和地址为必填项' });
      }

      const orderData = {
        tenant_id: req.currentTenant.id,
        customer_name,
        phone,
        address,
        title: req.body.title || '',
        description: req.body.description || '',
        pickup_address: req.body.pickup_address || '',
        delivery_address: req.body.delivery_address || '',
        pickup_time: req.body.pickup_time || null,
        delivery_time: req.body.delivery_time || null,
        distance: req.body.distance || 0,
        weight: req.body.weight || 0,
        volume: req.body.volume || 0,
        amount: req.body.amount || 0,
        items: JSON.stringify(items || []),
        notes: notes || '',
        status: 'pending',
        created_by: req.user.userId
      };

      const orderId = await Order.create(orderData, tenantCode);
      const createdOrder = await Order.findById(orderId, tenantCode);
      res.status(201).json({ success: true, message: '订单创建成功', data: { id: createdOrder.id, order_no: createdOrder.order_no } });
    } catch (error) {
      console.error('创建订单失败:', error);
      res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }

  // 获取单个订单
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const tenantCode = req.tenantCode;

      const order = await Order.findById(id, tenantCode);
      if (!order || order.tenant_id !== req.currentTenant.id) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      res.json({ success: true, data: order });
    } catch (error) {
      console.error('获取订单失败:', error);
      res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }

  // 订单列表（分页）
  static async list(req, res) {
    try {
      // 添加性能日志
      const startTime = Date.now();
      console.log('[PERFORMANCE] 开始获取订单列表...', {
        query: req.query,
        user: req.user,
        currentTenant: req.currentTenant
      });

      const { page = 1, limit = 10, status } = req.query;
      const tenantCode = req.tenantCode;

      // 限制最大分页数量，防止恶意请求
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // 限制每页最多100条
      const offset = (pageNum - 1) * limitNum;

      // 根据用户角色过滤订单 - 实现C2C众包平台逻辑
      let conditions = {};

      if (req.user && req.user.role === 'worker') {
        if (status === 'pending') {
          // 工人查看待处理订单 - 可以看到其他租户的待处理订单（但不能看自己租户的）
          conditions = {
            status: 'pending',
            tenant_id_not: req.currentTenant.id  // 排除自己租户的订单
          };
          console.log('[DEBUG] 工人查询其他租户的待处理订单');
        } else if (!status) {
          // 工人查看所有订单 - 只看分配给自己的订单
          conditions = {
            assignee_user_id: req.user.userId
          };
          console.log('[DEBUG] 工人查询分配给自己的所有订单');
        } else {
          // 工人查看特定状态订单 - 只看分配给自己的订单
          conditions = {
            status: status,
            assignee_user_id: req.user.userId
          };
          console.log('[DEBUG] 工人查询分配给自己的特定状态订单');
        }
      } else if (req.user && (req.user.role === 'admin' || req.user.role === 'platform_admin')) {
        // 平台管理员 - 可以看到所有订单
        if (status) {
          conditions.status = status;
        }
        console.log('[DEBUG] 平台管理员查询订单');
      } else {
        // 租户管理员 - 只看自己租户的订单
        conditions = { tenant_id: req.currentTenant.id };
        if (status) conditions.status = status;
        console.log('[DEBUG] 租户用户查询自己租户的订单');
      }

      // 执行查询
      console.log('[DEBUG] 执行查询逻辑，条件:', conditions);
      const { rows, total } = await Order.list(conditions, { limit: limitNum, offset }, tenantCode);

      const endTime = Date.now();
      console.log(`[PERFORMANCE] 获取订单列表完成，耗时: ${endTime - startTime}ms，返回 ${rows.length} 条记录`);

      res.json({
        success: true,
        data: {
          orders: rows,
          pagination: {
            current: pageNum,
            pageSize: limitNum,
            total,
            pages: Math.ceil(total / limitNum)  // 添加总页数
          }
        }
      });
    } catch (error) {
      console.error('查询订单列表失败:', error);
      console.error('错误堆栈:', error.stack);
      res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }

  // 分配订单
  static async assignOrder(req, res) {
    try {
      const { id } = req.params;
      const { assigneeId } = req.body;
      const tenantCode = req.tenantCode;

      const order = await Order.findById(id, tenantCode);
      if (!order) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      if (order.status !== 'pending') {
        return res.status(400).json({ success: false, message: '只能分配待处理的订单' });
      }

      // 只有平台管理员可以分配订单
      if (req.user.role !== 'admin' && req.user.role !== 'platform_admin') {
        return res.status(403).json({ success: false, message: '只有平台管理员可以分配订单' });
      }

      // 需要指定接单人ID
      if (!assigneeId) {
        return res.status(400).json({ success: false, message: '需要指定接单人ID' });
      }

      // 获取接单人信息（可能来自任何租户）
      const assignee = await User.findById(assigneeId, tenantCode);

      if (!assignee || assignee.role !== 'worker') {
        return res.status(400).json({ success: false, message: '无效的接单人' });
      }

      // 确保订单不是分配给发布订单的租户的工人
      if (order.tenant_id === assignee.tenant_id) {
        return res.status(400).json({ success: false, message: '不能将订单分配给发布订单的租户的工人' });
      }

      await Order.update(id, {
        status: 'assigned',
        assignee_user_id: assignee.id
      }, tenantCode);

      res.json({ success: true, message: '订单分配成功' });
    } catch (error) {
      console.error('分配订单失败:', error);
      res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }

  // 开始订单
  static async startOrder(req, res) {
    try {
      const { id } = req.params;
      const tenantCode = req.tenantCode;

      const order = await Order.findById(id, tenantCode);
      if (!order || order.tenant_id !== req.currentTenant.id) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      if (order.status !== 'assigned') {
        return res.status(400).json({ success: false, message: '只能开始已分配的订单' });
      }

      if (order.assignee_user_id !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '权限不足操作此订单' });
      }

      await Order.update(id, { status: 'in_progress' }, tenantCode);
      res.json({ success: true, message: '订单已开始' });
    } catch (error) {
      console.error('开始订单失败:', error);
      res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }

  // 完成订单
  static async completeOrder(req, res) {
    try {
      const { id } = req.params;
      const tenantCode = req.tenantCode;

      const order = await Order.findById(id, tenantCode);
      if (!order || order.tenant_id !== req.currentTenant.id) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      if (order.status !== 'in_progress') {
        return res.status(400).json({ success: false, message: '只能完成进行中的订单' });
      }

      if (order.assignee_user_id !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '权限不足操作此订单' });
      }

      await Order.update(id, { status: 'completed' }, tenantCode);
      res.json({ success: true, message: '订单已完成' });
    } catch (error) {
      console.error('完成订单失败:', error);
      res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }

  // 取消订单
  static async cancelOrder(req, res) {
    try {
      const { id } = req.params;
      const tenantCode = req.tenantCode;

      const order = await Order.findById(id, tenantCode);
      if (!order || order.tenant_id !== req.currentTenant.id) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      if (['completed', 'cancelled'].includes(order.status)) {
        return res.status(400).json({ success: false, message: '无法取消已完成或已取消的订单' });
      }

      await Order.update(id, { status: 'cancelled' }, tenantCode);
      res.json({ success: true, message: '订单已取消' });
    } catch (error) {
      console.error('取消订单失败:', error);
      res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }

  // 更新订单
  static async updateOrder(req, res) {
    try {
      const { id } = req.params;
      const { customer_name, phone, address, items, notes } = req.body;
      const tenantCode = req.tenantCode;

      const order = await Order.findById(id, tenantCode);
      if (!order || order.tenant_id !== req.currentTenant.id) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      if (order.status === 'completed' || order.status === 'cancelled') {
        return res.status(400).json({ success: false, message: '无法修改已完成或已取消的订单' });
      }

      const updateData = {};
      if (customer_name) updateData.customer_name = customer_name;
      if (phone) updateData.phone = phone;
      if (address) updateData.address = address;
      if (items) updateData.items = JSON.stringify(items);
      if (notes !== undefined) updateData.notes = notes;

      await Order.update(id, updateData, tenantCode);
      res.json({ success: true, message: '订单更新成功' });
    } catch (error) {
      console.error('更新订单失败:', error);
      res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }
}

// 👇 必须这样导出！
module.exports = OrderController;