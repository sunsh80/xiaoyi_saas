// backend/controllers/WechatPayController.js

const Order = require('../models/Order');
const WechatPayService = require('../services/WechatPayService');

class WechatPayController {
  /**
   * 微信支付回调通知
   */
  static async notify(req, res) {
    try {
      // 解析 XML 数据
      let xmlData = '';
      if (Buffer.isBuffer(req.body)) {
        xmlData = req.body.toString('utf-8');
      } else if (typeof req.body === 'string') {
        xmlData = req.body;
      } else {
        xmlData = JSON.stringify(req.body);
      }

      const notifyData = WechatPayService.parseNotifyXml(xmlData);

      // 验证签名
      if (!WechatPayService.verifyNotifySign({ ...notifyData })) {
        console.error('WechatPayController.notify: 签名验证失败');
        return res.type('application/xml').send(
          WechatPayService.buildFailResponse('签名验证失败')
        );
      }

      // 检查业务结果
      if (notifyData.return_code !== 'SUCCESS') {
        console.error('WechatPayController.notify: 支付失败', notifyData);
        return res.type('application/xml').send(
          WechatPayService.buildSuccessResponse('已接收')
        );
      }

      const orderNo = notifyData.out_trade_no;

      // 查找订单
      const order = await Order.findByOrderNo(orderNo, 'global');
      if (!order) {
        console.error('WechatPayController.notify: 订单不存在', orderNo);
        return res.type('application/xml').send(
          WechatPayService.buildFailResponse('订单不存在')
        );
      }

      // 检查订单状态，防止重复处理
      if (order.status === 'completed') {
        return res.type('application/xml').send(
          WechatPayService.buildSuccessResponse('已处理')
        );
      }

      // 验证金额
      const paidAmount = parseInt(notifyData.total_fee) / 100;
      if (Math.abs(paidAmount - parseFloat(order.amount)) > 0.01) {
        console.error('WechatPayController.notify: 金额不匹配', {
          orderNo,
          expected: order.amount,
          paid: paidAmount
        });
        return res.type('application/xml').send(
          WechatPayService.buildFailResponse('金额不匹配')
        );
      }

      // 更新订单状态为已完成
      await Order.update(order.id, {
        status: 'completed',
        complete_time: new Date()
      }, 'global');

      // TODO: 这里可以添加支付成功后的回调通知给第三方平台

      res.type('application/xml').send(
        WechatPayService.buildSuccessResponse()
      );
    } catch (error) {
      console.error('WechatPayController.notify error:', error);
      res.type('application/xml').send(
        WechatPayService.buildFailResponse('服务器内部错误')
      );
    }
  }

  /**
   * 发起支付（给前端/第三方调用）
   */
  static async createPayment(req, res) {
    try {
      const { order_no, open_id, trade_type = 'JSAPI' } = req.body;
      const tenantCode = req.tenantCode;

      const order = await Order.findByOrderNo(order_no, tenantCode);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: '订单不存在'
        });
      }

      if (order.status !== 'pending' && order.status !== 'assigned') {
        return res.status(400).json({
          success: false,
          message: '订单状态不允许支付'
        });
      }

      // 创建统一下单参数
      const params = WechatPayService.createUnifiedOrderParams(order, open_id, trade_type);

      // TODO: 调用微信统一下单接口获取 prepay_id
      // 这里需要实际调用微信 API，暂时返回参数供调试
      res.json({
        success: true,
        message: '支付参数已生成',
        data: {
          order_no: order.order_no,
          amount: order.amount,
          pay_params: params,
          trade_type: trade_type
        }
      });
    } catch (error) {
      console.error('WechatPayController.createPayment error:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = WechatPayController;
