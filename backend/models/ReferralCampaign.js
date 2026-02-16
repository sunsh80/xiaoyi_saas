const { getTenantConnection } = require('../middleware/tenant');

class ReferralCampaign {
  static tableName = 'referral_campaigns';

  constructor(data = {}) {
    this.id = data.id;
    this.campaign_name = data.campaign_name;
    this.campaign_title = data.campaign_title;
    this.campaign_description = data.campaign_description;
    this.share_title = data.share_title;
    this.share_desc = data.share_desc;
    this.share_image = data.share_image;
    this.referral_reward_type = data.referral_reward_type;
    this.referral_reward_amount = parseFloat(data.referral_reward_amount) || 0.00;
    this.referral_reward_percentage = parseFloat(data.referral_reward_percentage) || 0.00;
    this.referee_reward_type = data.referee_reward_type;
    this.referee_reward_amount = parseFloat(data.referee_reward_amount) || 0.00;
    this.referee_reward_percentage = parseFloat(data.referee_reward_percentage) || 0.00;
    this.reward_limit_per_referrer = data.reward_limit_per_referrer;
    this.reward_limit_per_referee = data.reward_limit_per_referee;
    this.start_time = data.start_time;
    this.end_time = data.end_time;
    this.status = data.status;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 根据ID获取推荐活动
   */
  static async findById(campaignId) {
    const pool = getTenantConnection('global'); // 推荐活动是全局的
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [campaignId]
      );
      return rows.length > 0 ? new ReferralCampaign(rows[0]) : null;
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 获取所有活跃的推荐活动
   */
  static async getActiveCampaigns() {
    const pool = getTenantConnection('global'); // 推荐活动是全局的
    const connection = await pool.getConnection();
    try {
      const now = new Date();
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName}
         WHERE status = 'active'
         AND start_time <= ?
         AND end_time >= ?`,
        [now, now]
      );
      return rows.map(row => new ReferralCampaign(row));
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 创建推荐活动
   */
  static async create(campaignData, createdBy) {
    const pool = getTenantConnection('global'); // 推荐活动是全局的
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName}
        (campaign_name, campaign_title, campaign_description, share_title, share_desc,
         share_image, referral_reward_type, referral_reward_amount, referral_reward_percentage,
         referee_reward_type, referee_reward_amount, referee_reward_percentage,
         reward_limit_per_referrer, reward_limit_per_referee, start_time, end_time,
         status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          campaignData.campaign_name,
          campaignData.campaign_title,
          campaignData.campaign_description,
          campaignData.share_title,
          campaignData.share_desc,
          campaignData.share_image,
          campaignData.referral_reward_type || 'fixed',
          campaignData.referral_reward_amount || 0.00,
          campaignData.referral_reward_percentage || 0.00,
          campaignData.referee_reward_type || 'fixed',
          campaignData.referee_reward_amount || 0.00,
          campaignData.referee_reward_percentage || 0.00,
          campaignData.reward_limit_per_referrer || null,
          campaignData.reward_limit_per_referee || null,
          campaignData.start_time,
          campaignData.end_time,
          campaignData.status || 'draft',
          createdBy
        ]
      );

      return await this.findById(result.insertId);
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 更新推荐活动
   */
  async update(updateData) {
    const pool = getTenantConnection('global'); // 推荐活动是全局的
    const connection = await pool.getConnection();
    try {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (this.hasOwnProperty(key) && key !== 'id' && key !== 'created_by') {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      values.push(this.id);

      await connection.execute(
        `UPDATE ${ReferralCampaign.tableName} SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      // 更新当前实例
      Object.assign(this, updateData);
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 激活活动
   */
  async activate() {
    const pool = getTenantConnection('global'); // 推荐活动是全局的
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `UPDATE ${ReferralCampaign.tableName} SET status = 'active' WHERE id = ?`,
        [this.id]
      );
      this.status = 'active';
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 暂停活动
   */
  async pause() {
    const pool = getTenantConnection('global'); // 推荐活动是全局的
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `UPDATE ${ReferralCampaign.tableName} SET status = 'paused' WHERE id = ?`,
        [this.id]
      );
      this.status = 'paused';
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 结束活动
   */
  async end() {
    const pool = getTenantConnection('global'); // 推荐活动是全局的
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `UPDATE ${ReferralCampaign.tableName} SET status = 'ended' WHERE id = ?`,
        [this.id]
      );
      this.status = 'ended';
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 检查活动是否有效
   */
  isActive() {
    const now = new Date();
    return this.status === 'active' && 
           new Date(this.start_time) <= now && 
           new Date(this.end_time) >= now;
  }

  /**
   * 获取活动详情
   */
  toJSON() {
    return {
      id: this.id,
      campaign_name: this.campaign_name,
      campaign_title: this.campaign_title,
      campaign_description: this.campaign_description,
      share_title: this.share_title,
      share_desc: this.share_desc,
      share_image: this.share_image,
      referral_reward_type: this.referral_reward_type,
      referral_reward_amount: this.referral_reward_amount,
      referral_reward_percentage: this.referral_reward_percentage,
      referee_reward_type: this.referee_reward_type,
      referee_reward_amount: this.referee_reward_amount,
      referee_reward_percentage: this.referee_reward_percentage,
      reward_limit_per_referrer: this.reward_limit_per_referrer,
      reward_limit_per_referee: this.reward_limit_per_referee,
      start_time: this.start_time,
      end_time: this.end_time,
      status: this.status,
      created_by: this.created_by,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = ReferralCampaign;