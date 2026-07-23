// backend/controllers/ThirdPartyOrderController.js

const Order = require('../models/Order');
const CallbackService = require('../services/CallbackService');

class ThirdPartyOrderController {
  /**
   * 第三方创建订单
   */
  static async create(req, res) {
    try {
      const {
        third_party_order_no,
        customer_name,
        phone,
        address,
        title,
        description,
        pickup_address,
        delivery_address,
        pickup_time,
        delivery_time,
        distance,
        weight,
        volume,
        amount,
        items,
        notes,
        callback_url
      } = req.body;

      const tenantCode = req.tenantCode;
      const platform = req.thirdPartyPlatform;

      // 参数校验
      if (!customer_name || !phone || !address) {
        return res.status(400).json({
          success: false,
          message: '客户姓名、电话和地址为必填项'
        });
      }

      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: '订单金额必须大于0'
        });
      }

      // 检查第三方订单号是否已存在
      if (third_party_order_no) {
        const existingOrder = await Order.findByThirdPartyOrderNo(third_party_order_no, tenantCode);
        if (existingOrder) {
          return res.status(409).json({
            success: false,
            message: '第三方订单号已存在'
          });
        }
      }

      const orderData = {
        tenant_id: req.currentTenant.id,
        customer_name,
        phone,
        address,
        title: title || '',
        description: description || '',
        pickup_address: pickup_address || '',
        delivery_address: delivery_address || '',
        pickup_time: pickup_time || null,
        delivery_time: delivery_time || null,
        distance: distance || 0,
        weight: weight || 0,
        volume: volume || 0,
        amount: amount,
        items: items ? JSON.stringify(items) : '[]',
        notes: notes || '',
        status: 'pending',
        source: 'third_party',
        third_party_order_no: third_party_order_no || null,
        callback_url: callback_url || platform.callback_url || null,
        created_by: null
      };

      const orderId = await Order.create(orderData, tenantCode);
      const createdOrder = await Order.findById(orderId, tenantCode);

      res.status(201).json({
        success: true,
        message: '订单创建成功',
        data: createdOrder.toJSON()
      });
    } catch (error) {
      console.error('ThirdPartyOrderController.create error:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 查询第三方订单状态
   */
  static async getByOrderNo(req, res) {
    try {
      const { order_no } = req.params;
      const tenantCode = req.tenantCode;

      const order = await Order.findByOrderNo(order_no, tenantCode);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: '订单不存在'
        });
      }

      // 验证订单来源
      if (order.source !== 'third_party') {
        return res.status(403).json({
          success: false,
          message: '无权查询非第三方订单'
        });
      }

      res.json({
        success: true,
        data: order.toJSON()
      });
    } catch (error) {
      console.error('ThirdPartyOrderController.getByOrderNo error:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 取消第三方订单
   */
  static async cancelOrder(req, res) {
    try {
      const { order_no } = req.params;
      const { reason } = req.body;
      const tenantCode = req.tenantCode;

      const order = await Order.findByOrderNo(order_no, tenantCode);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: '订单不存在'
        });
      }

      if (order.source !== 'third_party') {
        return res.status(403).json({
          success: false,
          message: '无权操作非第三方订单'
        });
      }

      if (['completed', 'cancelled'].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: '无法取消已完成或已取消的订单'
        });
      }

      await Order.update(order.id, { status: 'cancelled' }, tenantCode);

      // 发送取消回调
      const platform = req.thirdPartyPlatform;
      if (order.callback_url) {
        await CallbackService.notifyOrderCancel(order, platform.api_secret, reason);
      }

      const updatedOrder = await Order.findById(order.id, tenantCode);

      res.json({
        success: true,
        message: '订单已取消',
        data: updatedOrder.toJSON()
      });
    } catch (error) {
      console.error('ThirdPartyOrderController.cancelOrder error:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 对账查询
   */
  static async reconciliation(req, res) {
    try {
      const { startDate, endDate, page = 1, limit = 20 } = req.query;
      const tenantCode = req.tenantCode;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: '开始日期和结束日期为必填项'
        });
      }

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      const result = await Order.findByDateRange(
        startDate,
        endDate,
        tenantCode,
        { limit: limitNum, offset }
      );

      res.json({
        success: true,
        data: {
          orders: result.rows.map(order => order.toJSON()),
          pagination: {
            page: pageNum,
            pageSize: limitNum,
            total: result.total,
            pages: Math.ceil(result.total / limitNum)
          },
          summary: {
            total_amount: result.totalAmount,
            order_count: result.total
          }
        }
      });
    } catch (error) {
      console.error('ThirdPartyOrderController.reconciliation error:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = ThirdPartyOrderController;
