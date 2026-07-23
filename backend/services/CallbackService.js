// backend/services/CallbackService.js

const crypto = require('crypto');
const axios = require('axios');
const OrderCallback = require('../models/OrderCallback');

class CallbackService {
  /**
   * 发送回调通知
   * @param {number} orderId - 订单ID
   * @param {string} callbackUrl - 回调地址
   * @param {string} eventType - 事件类型
   * @param {object} payload - 回调数据
   * @param {string} apiSecret - 用于签名的 API Secret
   */
  static async sendCallback(orderId, callbackUrl, eventType, payload, apiSecret) {
    // 创建回调记录
    const callbackId = await OrderCallback.create({
      order_id: orderId,
      callback_url: callbackUrl,
      event_type: eventType,
      payload: payload,
      status: 'pending'
    });

    // 生成签名
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signString = `${eventType}.${timestamp}.${JSON.stringify(payload)}`;
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(signString)
      .digest('hex');

    try {
      const response = await axios.post(callbackUrl, {
        event_type: eventType,
        timestamp: timestamp,
        data: payload,
        sign: signature
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Callback-Signature': signature,
          'X-Callback-Timestamp': timestamp
        }
      });

      // 更新回调记录为成功
      await OrderCallback.update(callbackId, {
        response_code: response.status,
        response_body: JSON.stringify(response.data).substring(0, 2000),
        status: 'success'
      });

      return { success: true, callbackId };
    } catch (error) {
      // 计算下次重试时间（指数退避）
      const retryCount = 0;
      const nextRetryAt = new Date(Date.now() + Math.pow(2, retryCount) * 60 * 1000);

      // 更新回调记录为失败
      await OrderCallback.update(callbackId, {
        response_code: error.response ? error.response.status : null,
        response_body: error.message.substring(0, 2000),
        status: 'failed',
        retry_count: retryCount + 1,
        next_retry_at: nextRetryAt
      });

      return { success: false, error: error.message, callbackId };
    }
  }

  /**
   * 订单状态变更回调
   */
  static async notifyOrderStatusChange(order, apiSecret) {
    if (!order.callback_url) return { success: false, reason: 'no_callback_url' };

    const payload = {
      order_no: order.order_no,
      third_party_order_no: order.third_party_order_no,
      status: order.status,
      amount: order.amount,
      updated_at: order.updated_at
    };

    return await this.sendCallback(
      order.id,
      order.callback_url,
      'order_status_change',
      payload,
      apiSecret
    );
  }

  /**
   * 订单取消回调
   */
  static async notifyOrderCancel(order, apiSecret, reason = '') {
    if (!order.callback_url) return { success: false, reason: 'no_callback_url' };

    const payload = {
      order_no: order.order_no,
      third_party_order_no: order.third_party_order_no,
      status: 'cancelled',
      reason: reason,
      updated_at: order.updated_at
    };

    return await this.sendCallback(
      order.id,
      order.callback_url,
      'order_cancel',
      payload,
      apiSecret
    );
  }

  /**
   * 验证回调签名
   */
  static verifySignature(eventType, timestamp, data, signature, apiSecret) {
    const signString = `${eventType}.${timestamp}.${JSON.stringify(data)}`;
    const expectedSignature = crypto
      .createHmac('sha256', apiSecret)
      .update(signString)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

module.exports = CallbackService;
