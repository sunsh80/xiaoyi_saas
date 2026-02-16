const { getTenantConnection } = require('../middleware/tenant');

class Referral {
  static tableName = 'referrals';

  constructor(data = {}) {
    this.id = data.id;
    this.referrer_user_id = data.referrer_user_id;
    this.referee_user_id = data.referee_user_id;
    this.campaign_id = data.campaign_id;
    this.referral_code = data.referral_code;
    this.status = data.status;
    this.confirmed_at = data.confirmed_at;
    this.rewarded_at = data.rewarded_at;
    this.created_at = data.created_at;
  }

  /**
   * 根据推荐码查找推荐关系
   */
  static async findByReferralCode(referralCode) {
    const pool = getTenantConnection('global'); // 推荐关系是全局的
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE referral_code = ?`,
        [referralCode]
      );
      return rows.length > 0 ? new Referral(rows[0]) : null;
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 根据用户ID查找推荐关系
   */
  static async findByReferrerId(referrerId) {
    const pool = getTenantConnection('global'); // 推荐关系是全局的
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE referrer_user_id = ?`,
        [referrerId]
      );
      return rows.map(row => new Referral(row));
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 根据被推荐人ID查找推荐关系
   */
  static async findByRefereeId(refereeId) {
    const pool = getTenantConnection('global'); // 推荐关系是全局的
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE referee_user_id = ?`,
        [refereeId]
      );
      return rows.length > 0 ? new Referral(rows[0]) : null;
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 创建推荐关系
   */
  static async create(referrerId, refereeId, campaignId, referralCode) {
    const pool = getTenantConnection('global'); // 推荐关系是全局的
    const connection = await pool.getConnection();
    try {
      // 检查是否已存在相同的推荐关系
      const [existing] = await connection.execute(
        `SELECT id FROM ${this.tableName}
         WHERE referrer_user_id = ? AND referee_user_id = ? AND campaign_id = ?`,
        [referrerId, refereeId, campaignId]
      );

      if (existing.length > 0) {
        throw new Error('推荐关系已存在');
      }

      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName}
        (referrer_user_id, referee_user_id, campaign_id, referral_code, status)
        VALUES (?, ?, ?, ?, ?)`,
        [referrerId, refereeId, campaignId, referralCode, 'pending']
      );

      return await this.findById(result.insertId);
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 根据ID获取推荐关系
   */
  static async findById(id) {
    const pool = getTenantConnection('global'); // 推荐关系是全局的
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      return rows.length > 0 ? new Referral(rows[0]) : null;
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 确认推荐关系
   */
  async confirm() {
    if (this.status !== 'pending') {
      throw new Error('推荐关系状态异常，无法确认');
    }

    const pool = getTenantConnection('global'); // 推荐关系是全局的
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `UPDATE ${Referral.tableName}
         SET status = 'confirmed', confirmed_at = NOW()
         WHERE id = ?`,
        [this.id]
      );

      this.status = 'confirmed';
      this.confirmed_at = new Date();
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 发放奖励
   */
  async reward() {
    if (this.status !== 'confirmed') {
      throw new Error('推荐关系尚未确认，无法发放奖励');
    }

    const pool = getTenantConnection('global'); // 推荐关系是全局的
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `UPDATE ${Referral.tableName}
         SET status = 'rewarded', rewarded_at = NOW()
         WHERE id = ?`,
        [this.id]
      );

      this.status = 'rewarded';
      this.rewarded_at = new Date();

      // 创建奖励记录
      await this.createRewardRecords();
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 创建奖励记录
   */
  async createRewardRecords() {
    const ReferralReward = require('./ReferralReward');
    const ReferralCampaign = require('./ReferralCampaign');
    const Account = require('./Account');

    // 获取活动详情
    const campaign = await ReferralCampaign.findById(this.campaign_id);
    if (!campaign) {
      throw new Error('推荐活动不存在');
    }

    // 计算奖励金额
    const referrerRewardAmount = this.calculateRewardAmount(
      campaign.referral_reward_type,
      campaign.referral_reward_amount,
      campaign.referral_reward_percentage
    );

    const refereeRewardAmount = this.calculateRewardAmount(
      campaign.referee_reward_type,
      campaign.referee_reward_amount,
      campaign.referee_reward_percentage
    );

    // 为推荐人创建奖励记录
    if (referrerRewardAmount > 0) {
      await ReferralReward.create(
        this.id,
        this.referrer_user_id,
        'referrer',
        referrerRewardAmount,
        `推荐奖励 - 活动: ${campaign.campaign_name}`
      );

      // 增加推荐人账户余额
      const referrerAccount = await Account.getByUserId(this.referrer_user_id);
      if (referrerAccount) {
        await referrerAccount.increaseBalance(referrerRewardAmount);
      }
    }

    // 为被推荐人创建奖励记录
    if (refereeRewardAmount > 0) {
      await ReferralReward.create(
        this.id,
        this.referee_user_id,
        'referee',
        refereeRewardAmount,
        `被推荐奖励 - 活动: ${campaign.campaign_name}`
      );

      // 增加被推荐人账户余额
      const refereeAccount = await Account.getByUserId(this.referee_user_id);
      if (refereeAccount) {
        await refereeAccount.increaseBalance(refereeRewardAmount);
      }
    }
  }

  /**
   * 计算奖励金额
   */
  calculateRewardAmount(rewardType, fixedAmount, percentage) {
    if (rewardType === 'fixed') {
      return parseFloat(fixedAmount) || 0.00;
    } else if (rewardType === 'percentage') {
      // 对于推荐活动，百分比通常是基于某个基准金额
      // 这里简化处理，实际业务中可能需要根据具体情况调整
      return parseFloat(percentage) || 0.00;
    }
    return 0.00;
  }

  /**
   * 检查是否超过奖励限制
   */
  static async checkRewardLimits(referrerId, campaignId) {
    const pool = getTenantConnection('global'); // 推荐关系是全局的
    const connection = await pool.getConnection();
    try {
      // 获取活动详情
      const campaign = await require('./ReferralCampaign').findById(campaignId);
      if (!campaign) {
        throw new Error('推荐活动不存在');
      }

      // 检查推荐人奖励次数限制
      if (campaign.reward_limit_per_referrer) {
        const [referrerCount] = await connection.execute(
          `SELECT COUNT(*) as count FROM ${this.tableName}
           WHERE referrer_user_id = ? AND campaign_id = ? AND status = 'rewarded'`,
          [referrerId, campaignId]
        );

        if (referrerCount[0].count >= campaign.reward_limit_per_referrer) {
          return { canReward: false, reason: '推荐人奖励次数已达上限' };
        }
      }

      return { canReward: true, reason: null };
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 获取推荐统计
   */
  static async getReferralStats(referrerId) {
    const pool = getTenantConnection('global'); // 推荐关系是全局的
    const connection = await pool.getConnection();
    try {
      const [stats] = await connection.execute(
        `SELECT
          COUNT(*) as total_referrals,
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_referrals,
          SUM(CASE WHEN status = 'rewarded' THEN 1 ELSE 0 END) as rewarded_referrals
         FROM ${this.tableName}
         WHERE referrer_user_id = ?`,
        [referrerId]
      );

      return stats[0];
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 获取推荐详情
   */
  toJSON() {
    return {
      id: this.id,
      referrer_user_id: this.referrer_user_id,
      referee_user_id: this.referee_user_id,
      campaign_id: this.campaign_id,
      referral_code: this.referral_code,
      status: this.status,
      confirmed_at: this.confirmed_at,
      rewarded_at: this.rewarded_at,
      created_at: this.created_at
    };
  }
}

module.exports = Referral;