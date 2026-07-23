// backend/services/WechatPayService.js

const crypto = require('crypto');

class WechatPayService {
  constructor() {
    this.appId = process.env.WECHAT_APP_ID;
    this.mchId = process.env.WECHAT_MCH_ID;
    this.apiKey = process.env.WECHAT_API_KEY;
    this.notifyUrl = process.env.WECHAT_NOTIFY_URL;
  }

  /**
   * 生成微信支付签名
   */
  generateSignature(params) {
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys
      .map(key => `${key}=${params[key]}`)
      .join('&') + `&key=${this.apiKey}`;

    return crypto
      .createHash('md5')
      .update(signString)
      .digest('hex')
      .toUpperCase();
  }

  /**
   * 验证微信支付回调签名
   */
  verifyNotifySign(params) {
    const receivedSign = params.sign;
    delete params.sign;
    const expectedSign = this.generateSignature(params);
    return receivedSign === expectedSign;
  }

  /**
   * 创建统一下单参数
   * @param {object} order - 订单信息
   * @param {string} openId - 用户openId
   * @param {string} tradeType - 交易类型 JSAPI/NATIVE
   */
  createUnifiedOrderParams(order, openId, tradeType = 'JSAPI') {
    const nonceStr = this.generateNonceStr();
    const params = {
      appid: this.appId,
      mch_id: this.mchId,
      nonce_str: nonceStr,
      body: '小蚁搬运-订单支付',
      out_trade_no: order.order_no,
      total_fee: Math.round(parseFloat(order.amount) * 100), // 转为分
      spbill_create_ip: '127.0.0.1',
      notify_url: this.notifyUrl,
      trade_type: tradeType,
    };

    if (tradeType === 'JSAPI' && openId) {
      params.openid = openId;
    }

    params.sign = this.generateSignature(params);
    return params;
  }

  /**
   * 生成随机字符串
   */
  generateNonceStr(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 构建 JSAPI 支付参数（给前端调用）
   */
  buildJsApiPayParams(prepayId) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();
    const packageStr = `prepay_id=${prepayId}`;

    const payParams = {
      appId: this.appId,
      timeStamp: timestamp,
      nonceStr: nonceStr,
      package: packageStr,
      signType: 'MD5'
    };

    const signString = `appId=${this.appId}&timeStamp=${timestamp}&nonceStr=${nonceStr}&package=${packageStr}&signType=MD5&key=${this.apiKey}`;
    payParams.paySign = crypto
      .createHash('md5')
      .update(signString)
      .digest('hex')
      .toUpperCase();

    return payParams;
  }

  /**
   * 解析微信支付回调 XML
   */
  parseNotifyXml(xmlStr) {
    const result = {};
    const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>|<(\w+)>(.*?)<\/\3>/g;
    let match;
    while ((match = regex.exec(xmlStr)) !== null) {
      result[match[1] || match[3]] = match[2] || match[4];
    }
    return result;
  }

  /**
   * 构建成功响应 XML
   */
  buildSuccessResponse(returnMsg = 'OK') {
    return `<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[${returnMsg}]]></return_msg></xml>`;
  }

  /**
   * 构建失败响应 XML
   */
  buildFailResponse(returnMsg) {
    return `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[${returnMsg}]]></return_msg></xml>`;
  }
}

module.exports = new WechatPayService();
