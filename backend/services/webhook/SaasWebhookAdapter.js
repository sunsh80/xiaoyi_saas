// backend/services/webhook/SaasWebhookAdapter.js

const crypto = require('crypto');
const Order = require('../../models/Order');
const WebhookStatusMapping = require('../../models/WebhookStatusMapping');

class SaasWebhookAdapter {
  /**
   * 验证 SaaS Webhook 签名
   * 签名算法：HMAC-SHA256(secret, "${timestamp}.${jsonBody}")
   * 请求头：X-SaaS-Signature: sha256=<hex>
   *
   * @param {object} headers - 请求头
   * @param {object} body - 解析后的 JSON body
   * @param {string} secretKey - 平台 api_secret
   * @returns {boolean}
   */
  verifySignature(headers, body, secretKey) {
    const signature = headers['x-saas-signature'];
    const timestamp = headers['x-saas-timestamp'];

    if (!signature || !timestamp) return false;

    // 检查时间戳 freshness（防止重放攻击，允许 5 分钟偏差）
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) return false;

    // 计算期望签名
    const payloadString = JSON.stringify(body);
    const signedPayload = `${timestamp}.${payloadString}`;
    const expected = crypto
      .createHmac('sha256', secretKey)
      .update(signedPayload)
      .digest('hex');

    // 提取签名值（去掉 "sha256=" 前缀）
    const actualSignature = signature.replace('sha256=', '');

    // 安全比对（防止时序攻击）
    try {
      return crypto.timingSafeEqual(
        Buffer.from(actualSignature),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  }

  /**
   * 处理 Webhook 推送数据
   * @param {object} payload - 推送数据
   * @param {object} platform - 平台配置
   * @returns {object} { status, message, orderId, externalOrderNo, oldStatus, newStatus, mappedStatus, error }
   */
  async handlePayload(payload, platform) {
    const data = payload.data || {};
    const newStatus = data.new_status;
    const oldStatus = data.old_status || null;

    if (!newStatus) {
      return {
        status: 'failed',
        message: '缺少 new_status 字段',
        error: 'payload.data.new_status is required'
      };
    }

    // 1. 查找关联订单（按优先级）
    let order = null;
    const orderNos = [data.tms_order_no, data.saas_order_id, data.saas_order_no].filter(Boolean);

    for (const orderNo of orderNos) {
      order = await Order.findByThirdPartyOrderNo(orderNo, 'global');
      if (order) break;
    }

    if (!order) {
      return {
        status: 'ignored',
        message: '已接收，订单未关联',
        externalOrderNo: orderNos[0] || null,
        oldStatus,
        newStatus,
        mappedStatus: null
      };
    }

    // 2. 查找状态映射
    const mapping = await WebhookStatusMapping.findMapping(platform.code, newStatus);
    if (!mapping) {
      return {
        status: 'ignored',
        message: '已接收，状态未映射',
        orderId: order.id,
        externalOrderNo: order.third_party_order_no,
        oldStatus,
        newStatus,
        mappedStatus: null
      };
    }

    const mappedStatus = mapping.internal_status;

    // 3. 状态回退检查（不允许从终态回退）
    const terminalStatuses = ['completed', 'cancelled'];
    if (terminalStatuses.includes(order.status) && !terminalStatuses.includes(mappedStatus)) {
      return {
        status: 'ignored',
        message: '已接收，状态回退忽略',
        orderId: order.id,
        externalOrderNo: order.third_party_order_no,
        oldStatus,
        newStatus,
        mappedStatus
      };
    }

    // 4. 更新订单状态
    await Order.update(order.id, { status: mappedStatus }, 'global');

    return {
      status: 'success',
      message: '已接收',
      orderId: order.id,
      externalOrderNo: order.third_party_order_no,
      oldStatus,
      newStatus,
      mappedStatus
    };
  }
}

module.exports = SaasWebhookAdapter;
