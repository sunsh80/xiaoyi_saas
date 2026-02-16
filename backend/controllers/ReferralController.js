const ReferralCampaign = require('../models/ReferralCampaign');
const Referral = require('../models/Referral');
const ReferralReward = require('../models/ReferralReward');

class ReferralController {
  /**
   * 获取推荐活动详情
   */
  static async getCampaign(req, res) {
    try {
      const campaignId = req.params.id;

      const campaign = await ReferralCampaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: '推荐活动不存在'
        });
      }

      if (!campaign.isActive()) {
        return res.status(400).json({
          success: false,
          message: '推荐活动未激活或已过期'
        });
      }

      res.json({
        success: true,
        data: {
          campaign: campaign.toJSON()
        }
      });
    } catch (error) {
      console.error('获取推荐活动错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取推荐活动详情（别名方法，用于路由）
   */
  static async getCampaignDetails(req, res) {
    return this.getCampaign(req, res);
  }

  /**
   * 获取当前可用的推荐活动
   */
  static async getActiveCampaigns(req, res) {
    try {
      // 添加性能日志
      const startTime = Date.now();
      console.log('[PERFORMANCE] 开始获取推荐活动列表...');

      const campaigns = await ReferralCampaign.getActiveCampaigns();

      const endTime = Date.now();
      console.log(`[PERFORMANCE] 获取推荐活动列表完成，耗时: ${endTime - startTime}ms，返回 ${campaigns.length} 个活动`);

      res.json({
        success: true,
        data: {
          campaigns
        }
      });
    } catch (error) {
      console.error('获取推荐活动列表错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取用户的推荐统计
   */
  static async getReferralStats(req, res) {
    try {
      const userId = req.user.userId;

      const stats = await Referral.getReferralStats(userId);

      res.json({
        success: true,
        data: {
          stats
        }
      });
    } catch (error) {
      console.error('获取推荐统计错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取用户的推荐奖励记录
   */
  static async getReferralRewards(req, res) {
    try {
      const userId = req.user.userId;
      const { status, page = 1, limit = 10 } = req.query;

      const options = {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        status: status || undefined
      };

      const rewards = await ReferralReward.findByUserId(userId, options);

      // 获取总数
      const connection = await require('../middleware/tenant').getTenantConnection('global');
      try {
        let countQuery = `SELECT COUNT(*) as count FROM ${ReferralReward.tableName} WHERE user_id = ?`;
        const countParams = [userId];

        if (status) {
          countQuery += ` AND status = ?`;
          countParams.push(status);
        }

        const [countResult] = await connection.execute(countQuery, countParams);
        const totalCount = countResult[0].count;

        res.json({
          success: true,
          data: {
            rewards,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: totalCount,
              pages: Math.ceil(totalCount / parseInt(limit))
            }
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('获取推荐奖励记录错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取用户的推荐奖励记录（别名方法，用于路由）
   */
  static async getRewardHistory(req, res) {
    return this.getReferralRewards(req, res);
  }

  /**
   * 获取用户的总奖励金额
   */
  static async getTotalRewards(req, res) {
    try {
      const userId = req.user.userId;

      const totalRewards = await ReferralReward.getTotalRewardsByUser(userId);

      res.json({
        success: true,
        data: {
          totalRewards
        }
      });
    } catch (error) {
      console.error('获取总奖励金额错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 生成推荐链接/二维码
   */
  static async generateReferralLink(req, res) {
    try {
      const userId = req.user.userId;
      const { campaignId } = req.body;

      // 验证活动是否存在且有效
      const campaign = await ReferralCampaign.findById(campaignId);
      if (!campaign || !campaign.isActive()) {
        return res.status(400).json({
          success: false,
          message: '推荐活动不存在或未激活'
        });
      }

      // 生成唯一的推荐码（可以使用用户ID和时间戳等信息生成）
      const referralCode = `REF_${userId}_${Date.now()}`;

      // 这里可以生成实际的推荐链接或二维码
      const referralLink = `${process.env.FRONTEND_URL || 'https://xiaoyibanyun.com'}/register?ref=${referralCode}&campaign=${campaignId}`;

      res.json({
        success: true,
        data: {
          referralCode,
          referralLink,
          shareInfo: {
            title: campaign.share_title,
            desc: campaign.share_desc,
            imageUrl: campaign.share_image,
            path: `/pages/auth/register?ref=${referralCode}&campaign=${campaignId}`
          }
        }
      });
    } catch (error) {
      console.error('生成推荐链接错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 处理新用户注册时的推荐关系
   */
  static async handleReferralOnRegister(req, res, next) {
    // 这个方法会在用户注册时被调用
    // 通过中间件方式实现，检查注册请求中是否包含推荐码
    const { referralCode } = req.body;

    if (referralCode) {
      req.referralCode = referralCode;
    }

    next();
  }

  /**
   * 确认推荐关系（当被推荐人完成首次订单后）
   */
  static async confirmReferral(req, res) {
    try {
      const refereeId = req.user.userId; // 被推荐人就是当前登录用户
      const { referralCode } = req.body;

      if (!referralCode) {
        return res.status(400).json({
          success: false,
          message: '缺少推荐码'
        });
      }

      // 查找推荐关系
      const referral = await Referral.findByReferralCode(referralCode);
      if (!referral) {
        return res.status(404).json({
          success: false,
          message: '推荐码无效'
        });
      }

      // 检查是否已经是被推荐人
      if (referral.referee_user_id !== refereeId) {
        return res.status(400).json({
          success: false,
          message: '推荐码与当前用户不匹配'
        });
      }

      // 检查是否已经确认
      if (referral.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: '推荐关系状态异常'
        });
      }

      // 确认推荐关系
      await referral.confirm();

      res.json({
        success: true,
        message: '推荐关系确认成功',
        data: {
          referral: referral.toJSON()
        }
      });
    } catch (error) {
      console.error('确认推荐关系错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = ReferralController;