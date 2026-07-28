// backend/controllers/WebhookIncomingController.js

const WebhookAdapterManager = require('../services/webhook/WebhookAdapterManager');
const IncomingWebhookLog = require('../models/IncomingWebhookLog');

class WebhookIncomingController {
  /**
   * 接收外部平台 Webhook 推送
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  static async receive(req, res) {
    const startTime = Date.now();
    const { platform_code } = req.params;

    try {
      // 1. 查找平台配置
      const platform = await WebhookAdapterManager.getPlatform(platform_code);
      if (!platform) {
        return res.status(404).json({
          success: false,
          message: '平台未注册'
        });
      }

      // 2. 获取适配器
      const adapter = WebhookAdapterManager.getAdapter(platform);
      if (!adapter) {
        return res.status(404).json({
          success: false,
          message: '平台适配器未配置'
        });
      }

      // 3. 验证签名
      const isValid = adapter.verifySignature(req.headers, req.body, platform.api_secret);
      if (!isValid) {
        await IncomingWebhookLog.create({
          platform_code,
          event_type: req.body.event_type || 'unknown',
          event_id: req.headers['x-saas-event-id'] || null,
          raw_body: JSON.stringify(req.body),
          signature_valid: false,
          processing_status: 'failed',
          error_message: '签名验证失败',
          response_time_ms: Date.now() - startTime
        });

        return res.status(401).json({
          success: false,
          message: '签名验证失败'
        });
      }

      // 4. 处理推送数据
      const result = await adapter.handlePayload(req.body, platform);

      // 5. 记录日志
      await IncomingWebhookLog.create({
        platform_code,
        event_type: req.body.event_type || 'unknown',
        event_id: req.headers['x-saas-event-id'] || null,
        raw_body: JSON.stringify(req.body),
        mapped_order_id: result.orderId || null,
        external_order_no: result.externalOrderNo || null,
        external_old_status: result.oldStatus || null,
        external_new_status: result.newStatus || null,
        mapped_status: result.mappedStatus || null,
        processing_status: result.status,
        error_message: result.error || null,
        signature_valid: true,
        response_time_ms: Date.now() - startTime
      });

      // 6. 始终返回 200（避免推送方重试）
      return res.status(200).json({
        success: true,
        message: result.message || '已接收'
      });
    } catch (error) {
      console.error('WebhookIncomingController.receive error:', error);

      // 即使内部错误也返回 200，记录日志
      try {
        await IncomingWebhookLog.create({
          platform_code,
          event_type: req.body?.event_type || 'unknown',
          raw_body: JSON.stringify(req.body),
          processing_status: 'failed',
          error_message: error.message,
          signature_valid: true,
          response_time_ms: Date.now() - startTime
        });
      } catch (logError) {
        console.error('WebhookIncomingController.receive logError:', logError);
      }

      return res.status(200).json({
        success: true,
        message: '已接收，处理异常已记录'
      });
    }
  }
}

module.exports = WebhookIncomingController;
