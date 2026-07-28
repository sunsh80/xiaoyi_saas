// backend/services/webhook/WebhookAdapterManager.js

const ThirdPartyPlatform = require('../../models/ThirdPartyPlatform');

// 适配器注册表
const adapters = {};

class WebhookAdapterManager {
  /**
   * 注册适配器
   * @param {string} className - 适配器类名
   * @param {Function} AdapterClass - 适配器构造函数
   */
  static register(className, AdapterClass) {
    adapters[className] = AdapterClass;
  }

  /**
   * 根据平台编码查找平台配置
   * @param {string} platformCode - 平台编码
   * @returns {ThirdPartyPlatform|null}
   */
  static async getPlatform(platformCode) {
    return ThirdPartyPlatform.findByCode(platformCode);
  }

  /**
   * 根据平台配置获取对应适配器实例
   * @param {ThirdPartyPlatform} platform - 平台配置
   * @returns {object|null} 适配器实例
   */
  static getAdapter(platform) {
    if (!platform.adapter_class) return null;
    const AdapterClass = adapters[platform.adapter_class];
    if (!AdapterClass) return null;
    return new AdapterClass();
  }
}

// 自动注册已知适配器
try {
  const SaasWebhookAdapter = require('./SaasWebhookAdapter');
  WebhookAdapterManager.register('SaasWebhookAdapter', SaasWebhookAdapter);
} catch (e) {
  // 适配器尚未创建，忽略
}

module.exports = WebhookAdapterManager;
