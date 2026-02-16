const ReferralCampaign = require('../models/ReferralCampaign');
const Referral = require('../models/Referral');
const ReferralReward = require('../models/ReferralReward');

class AdminReferralController {
  /**
   * 获取推荐活动列表
   */
  static async getCampaignList(req, res) {
    try {
      const { status, page = 1, limit = 10 } = req.query;

      const pool = await require('../middleware/tenant').getTenantConnection('global');
      const connection = await pool.getConnection();
      try {
        let query = `SELECT * FROM ${ReferralCampaign.tableName}`;
        const params = [];
        const conditions = [];

        if (status) {
          conditions.push('status = ?');
          params.push(status);
        }

        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY created_at DESC`;

        const limitValue = parseInt(limit);
        const offsetValue = (parseInt(page) - 1) * limitValue;

        query += ` LIMIT ${limitValue} OFFSET ${offsetValue}`;

        const [rows] = await connection.execute(query, params);
        const campaigns = rows.map(row => new ReferralCampaign(row));

        // 获取总数
        let countQuery = `SELECT COUNT(*) as count FROM ${ReferralCampaign.tableName}`;
        const countParams = [];

        if (status) {
          countQuery += ` WHERE status = ?`;
          countParams.push(status);
        }

        const [countResult] = await connection.execute(countQuery, countParams);
        const totalCount = countResult[0].count;

        res.json({
          success: true,
          data: {
            campaigns,
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
      console.error('获取推荐活动列表错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取推荐活动详情
   */
  static async getCampaignDetail(req, res) {
    try {
      const campaignId = req.params.id;

      const campaign = await ReferralCampaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: '推荐活动不存在'
        });
      }

      res.json({
        success: true,
        data: {
          campaign: campaign.toJSON()
        }
      });
    } catch (error) {
      console.error('获取推荐活动详情错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 创建推荐活动
   */
  static async createCampaign(req, res) {
    try {
      const {
        campaign_name,
        campaign_title,
        campaign_description,
        share_title,
        share_desc,
        share_image,
        referral_reward_type,
        referral_reward_amount,
        referral_reward_percentage,
        referee_reward_type,
        referee_reward_amount,
        referee_reward_percentage,
        reward_limit_per_referrer,
        reward_limit_per_referee,
        start_time,
        end_time
      } = req.body;

      const adminUserId = req.user.userId;

      // 验证必要字段
      if (!campaign_name || !campaign_title || !share_title || !start_time || !end_time) {
        return res.status(400).json({
          success: false,
          message: '缺少必要字段'
        });
      }

      // 验证时间
      const startTime = new Date(start_time);
      const endTime = new Date(end_time);
      if (startTime >= endTime) {
        return res.status(400).json({
          success: false,
          message: '开始时间必须早于结束时间'
        });
      }

      // 创建活动
      const campaignData = {
        campaign_name,
        campaign_title,
        campaign_description,
        share_title,
        share_desc,
        share_image,
        referral_reward_type,
        referral_reward_amount,
        referral_reward_percentage,
        referee_reward_type,
        referee_reward_amount,
        referee_reward_percentage,
        reward_limit_per_referrer,
        reward_limit_per_referee,
        start_time,
        end_time,
        status: 'draft' // 默认为草稿状态
      };

      const campaign = await ReferralCampaign.create(campaignData, adminUserId);

      res.status(201).json({
        success: true,
        message: '推荐活动创建成功',
        data: {
          campaign: campaign.toJSON()
        }
      });
    } catch (error) {
      console.error('创建推荐活动错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '服务器内部错误'
      });
    }
  }

  /**
   * 更新推荐活动
   */
  static async updateCampaign(req, res) {
    try {
      const campaignId = req.params.id;
      const updateData = req.body;

      const campaign = await ReferralCampaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: '推荐活动不存在'
        });
      }

      // 不允许修改关键字段（如果活动已激活）
      if (campaign.status === 'active' && 
          (updateData.start_time || updateData.end_time || updateData.referral_reward_amount || updateData.referee_reward_amount)) {
        return res.status(400).json({
          success: false,
          message: '活动已激活，不允许修改关键字段'
        });
      }

      await campaign.update(updateData);

      res.json({
        success: true,
        message: '推荐活动更新成功',
        data: {
          campaign: campaign.toJSON()
        }
      });
    } catch (error) {
      console.error('更新推荐活动错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 激活推荐活动
   */
  static async activateCampaign(req, res) {
    try {
      const campaignId = req.params.id;

      const campaign = await ReferralCampaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: '推荐活动不存在'
        });
      }

      await campaign.activate();

      res.json({
        success: true,
        message: '推荐活动已激活'
      });
    } catch (error) {
      console.error('激活推荐活动错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 暂停推荐活动
   */
  static async pauseCampaign(req, res) {
    try {
      const campaignId = req.params.id;

      const campaign = await ReferralCampaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: '推荐活动不存在'
        });
      }

      await campaign.pause();

      res.json({
        success: true,
        message: '推荐活动已暂停'
      });
    } catch (error) {
      console.error('暂停推荐活动错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 结束推荐活动
   */
  static async endCampaign(req, res) {
    try {
      const campaignId = req.params.id;

      const campaign = await ReferralCampaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: '推荐活动不存在'
        });
      }

      await campaign.end();

      res.json({
        success: true,
        message: '推荐活动已结束'
      });
    } catch (error) {
      console.error('结束推荐活动错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取推荐统计
   */
  static async getReferralStats(req, res) {
    try {
      const { campaignId, startDate, endDate } = req.query;

      const pool = await require('../middleware/tenant').getTenantConnection('global');
      const connection = await pool.getConnection();
      try {
        let baseQuery = `SELECT
          COUNT(*) as total_referrals,
          SUM(CASE WHEN r.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_referrals,
          SUM(CASE WHEN r.status = 'rewarded' THEN 1 ELSE 0 END) as rewarded_referrals,
          COALESCE(SUM(rr1.reward_amount), 0) as total_referrer_rewards,
          COALESCE(SUM(rr2.reward_amount), 0) as total_referee_rewards,
          COALESCE(SUM(rr1.reward_amount), 0) + COALESCE(SUM(rr2.reward_amount), 0) as total_rewards
        FROM referrals r
        LEFT JOIN referral_rewards rr1 ON r.id = rr1.referral_id AND rr1.reward_type = 'referrer'
        LEFT JOIN referral_rewards rr2 ON r.id = rr2.referral_id AND rr2.reward_type = 'referee' WHERE 1=1`;

        const params = [];

        if (campaignId) {
          baseQuery += ` AND r.campaign_id = ?`;
          params.push(campaignId);
        }

        if (startDate) {
          baseQuery += ` AND r.created_at >= ?`;
          params.push(startDate);
        }

        if (endDate) {
          baseQuery += ` AND r.created_at <= ?`;
          params.push(endDate);
        }

        const [stats] = await connection.execute(baseQuery, params);

        res.json({
          success: true,
          data: {
            stats: stats[0]
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('获取推荐统计错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取推荐列表
   */
  static async getReferralList(req, res) {
    try {
      const { campaignId, referrerId, status, page = 1, limit = 10, startDate, endDate } = req.query;

      const pool = await require('../middleware/tenant').getTenantConnection('global');
      const connection = await pool.getConnection();
      try {
        let query = `SELECT r.*, u1.real_name as referrer_name, u2.real_name as referee_name,
                     rc.campaign_name
                     FROM referrals r
                     LEFT JOIN users u1 ON r.referrer_user_id = u1.id
                     LEFT JOIN users u2 ON r.referee_user_id = u2.id
                     LEFT JOIN referral_campaigns rc ON r.campaign_id = rc.id
                     WHERE 1=1`;
        const params = [];
        const conditions = [];

        if (campaignId) {
          conditions.push('r.campaign_id = ?');
          params.push(campaignId);
        }

        if (referrerId) {
          conditions.push('r.referrer_user_id = ?');
          params.push(referrerId);
        }

        if (status) {
          conditions.push('r.status = ?');
          params.push(status);
        }

        if (startDate) {
          conditions.push('r.created_at >= ?');
          params.push(startDate);
        }

        if (endDate) {
          conditions.push('r.created_at <= ?');
          params.push(endDate);
        }

        if (conditions.length > 0) {
          query += ` AND ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY r.created_at DESC`;

        if (limit) {
          query += ` LIMIT ?`;
          params.push(parseInt(limit));

          if ((page - 1) * limit) {
            query += ` OFFSET ?`;
            params.push((parseInt(page) - 1) * parseInt(limit));
          }
        }

        const [rows] = await connection.execute(query, params);

        // 获取总数
        let countQuery = `SELECT COUNT(*) as count FROM referrals r WHERE 1=1`;
        const countParams = [];

        if (campaignId) {
          countQuery += ` AND r.campaign_id = ?`;
          countParams.push(campaignId);
        }

        if (referrerId) {
          countQuery += ` AND r.referrer_user_id = ?`;
          countParams.push(referrerId);
        }

        if (status) {
          countQuery += ` AND r.status = ?`;
          countParams.push(status);
        }

        if (startDate) {
          countQuery += ` AND r.created_at >= ?`;
          countParams.push(startDate);
        }

        if (endDate) {
          countQuery += ` AND r.created_at <= ?`;
          countParams.push(endDate);
        }

        const [countResult] = await connection.execute(countQuery, countParams);
        const totalCount = countResult[0].count;

        res.json({
          success: true,
          data: {
            referrals: rows,
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
      console.error('获取推荐列表错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = AdminReferralController;