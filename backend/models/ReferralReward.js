const { getTenantConnection } = require('../middleware/tenant');

class ReferralReward {
  static tableName = 'referral_rewards';

  constructor(data = {}) {
    this.id = data.id;
    this.referral_id = data.referral_id;
    this.user_id = data.user_id;
    this.reward_type = data.reward_type;
    this.reward_amount = parseFloat(data.reward_amount) || 0.00;
    this.reward_description = data.reward_description;
    this.status = data.status;
    this.paid_at = data.paid_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 根据ID获取推荐奖励
   */
  static async findById(rewardId) {
    const pool = getTenantConnection('global'); // 推荐奖励是全局的
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [rewardId]
      );
      return rows.length > 0 ? new ReferralReward(rows[0]) : null;
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 根据推荐关系ID获取奖励
   */
  static async findByReferralId(referralId) {
    const pool = getTenantConnection('global'); // 推荐奖励是全局的
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE referral_id = ?`,
        [referralId]
      );
      return rows.map(row => new ReferralReward(row));
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 根据用户ID获取奖励记录
   */
  static async findByUserId(userId, options = {}) {
    const pool = getTenantConnection('global'); // 推荐奖励是全局的
    const connection = await pool.getConnection();
    try {
      let query = `SELECT * FROM ${this.tableName} WHERE user_id = ?`;
      const params = [userId];

      if (options.status) {
        query += ` AND status = ?`;
        params.push(options.status);
      }

      query += ` ORDER BY created_at DESC`;

      if (options.limit) {
        query += ` LIMIT ?`;
        params.push(options.limit);

        if (options.offset) {
          query += ` OFFSET ?`;
          params.push(options.offset);
        }
      }

      const [rows] = await connection.execute(query, params);
      return rows.map(row => new ReferralReward(row));
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 创建推荐奖励记录
   */
  static async create(referralId, userId, rewardType, rewardAmount, description) {
    const pool = getTenantConnection('global'); // 推荐奖励是全局的
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName}
        (referral_id, user_id, reward_type, reward_amount, reward_description, status)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [referralId, userId, rewardType, rewardAmount, description, 'pending']
      );

      return await this.findById(result.insertId);
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 发放奖励
   */
  async pay() {
    if (this.status !== 'pending') {
      throw new Error('奖励状态异常，无法发放');
    }

    const pool = getTenantConnection('global'); // 推荐奖励是全局的
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `UPDATE ${ReferralReward.tableName}
         SET status = 'paid', paid_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [this.id]
      );

      this.status = 'paid';
      this.paid_at = new Date();
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 标记奖励发放失败
   */
  async markAsFailed() {
    const pool = getTenantConnection('global'); // 推荐奖励是全局的
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `UPDATE ${ReferralReward.tableName}
         SET status = 'failed', updated_at = NOW()
         WHERE id = ?`,
        [this.id]
      );

      this.status = 'failed';
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 获取用户总奖励金额
   */
  static async getTotalRewardsByUser(userId, status = 'paid') {
    const pool = getTenantConnection('global'); // 推荐奖励是全局的
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `SELECT SUM(reward_amount) as total_rewards
         FROM ${this.tableName}
         WHERE user_id = ? AND status = ?`,
        [userId, status]
      );

      return parseFloat(result[0].total_rewards) || 0.00;
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 获取奖励统计
   */
  static async getRewardStats(userId) {
    const pool = getTenantConnection('global'); // 推荐奖励是全局的
    const connection = await pool.getConnection();
    try {
      const [stats] = await connection.execute(
        `SELECT
          COUNT(*) as total_rewards,
          SUM(CASE WHEN status = 'paid' THEN reward_amount ELSE 0 END) as total_paid,
          SUM(CASE WHEN status = 'pending' THEN reward_amount ELSE 0 END) as total_pending,
          SUM(CASE WHEN status = 'failed' THEN reward_amount ELSE 0 END) as total_failed
         FROM ${this.tableName}
         WHERE user_id = ?`,
        [userId]
      );

      return stats[0];
    } finally {
      connection.release(); // 释放连接回池
    }
  }

  /**
   * 获取奖励详情
   */
  toJSON() {
    return {
      id: this.id,
      referral_id: this.referral_id,
      user_id: this.user_id,
      reward_type: this.reward_type,
      reward_amount: this.reward_amount,
      reward_description: this.reward_description,
      status: this.status,
      paid_at: this.paid_at,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = ReferralReward;