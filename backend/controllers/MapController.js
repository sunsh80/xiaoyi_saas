/**
 * 地图服务控制器
 * 提供地址搜索、位置服务和工人轨迹功能
 */

const MapService = require('../services/MapService');
const Order = require('../models/Order');
const { getTenantConnection } = require('../middleware/tenant');

class MapController {
  constructor() {
    this.mapService = new MapService();
  }

  /**
   * 搜索地址
   */
  static async searchAddress(req, res) {
    try {
      const { keyword, city } = req.query;
      const mapService = new MapService();

      if (!keyword) {
        return res.status(400).json({
          success: false,
          message: '关键字不能为空'
        });
      }

      const results = await mapService.searchAddress(keyword, city);

      res.json({
        success: true,
        data: {
          addresses: results
        }
      });
    } catch (error) {
      console.error('地址搜索失败:', error);
      res.status(500).json({
        success: false,
        message: '地址搜索服务异常'
      });
    }
  }

  /**
   * 地理编码 - 地址转坐标
   */
  static async geocode(req, res) {
    try {
      const { address } = req.body;
      const mapService = new MapService();

      if (!address) {
        return res.status(400).json({
          success: false,
          message: '地址不能为空'
        });
      }

      const result = await mapService.geocodeAddress(address);

      if (result) {
        res.json({
          success: true,
          data: result
        });
      } else {
        res.status(404).json({
          success: false,
          message: '未能解析该地址'
        });
      }
    } catch (error) {
      console.error('地理编码失败:', error);
      res.status(500).json({
        success: false,
        message: '地址解析服务异常'
      });
    }
  }

  /**
   * 计算距离
   */
  static async calculateDistance(req, res) {
    try {
      const { origins, destinations } = req.body;
      const mapService = new MapService();

      if (!origins || !destinations) {
        return res.status(400).json({
          success: false,
          message: '起点和终点不能为空'
        });
      }

      // 如果是单个起点和终点
      if (typeof origins === 'object' && typeof destinations === 'object') {
        const distanceInfo = await mapService.calculateDistance(origins, destinations);

        res.json({
          success: true,
          data: distanceInfo
        });
      } else {
        res.status(400).json({
          success: false,
          message: '参数格式错误'
        });
      }
    } catch (error) {
      console.error('距离计算失败:', error);
      res.status(500).json({
        success: false,
        message: '距离计算服务异常'
      });
    }
  }

  /**
   * 逆地理编码 - 坐标转地址
   */
  static async reverseGeocode(req, res) {
    try {
      const { lat, lng } = req.body;
      const mapService = new MapService();

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: '经纬度不能为空'
        });
      }

      const result = await mapService.reverseGeocode(parseFloat(lat), parseFloat(lng));

      if (result) {
        res.json({
          success: true,
          data: result
        });
      } else {
        res.status(404).json({
          success: false,
          message: '未能解析该位置'
        });
      }
    } catch (error) {
      console.error('逆地理编码失败:', error);
      res.status(500).json({
        success: false,
        message: '位置解析服务异常'
      });
    }
  }

  /**
   * 获取工人实时位置
   */
  static async getWorkerLocation(req, res) {
    try {
      const { workerId } = req.params;
      const tenantCode = req.tenantCode;

      // 检查权限 - 只有订单相关的租户管理员或平台管理员可以查看工人位置
      if (req.user.role !== 'tenant_admin' && req.user.role !== 'admin' && req.user.role !== 'platform_admin') {
        // 工人只能查看自己的位置
        if (req.user.role === 'worker' && req.user.userId != workerId) {
          return res.status(403).json({
            success: false,
            message: '无权限查看其他工人位置'
          });
        }
      }

      // 从数据库或缓存中获取工人位置信息
      // 这里应该从位置追踪服务或数据库中获取最新的位置信息
      const locationRecord = await MapController.getLocationFromDB(workerId, tenantCode, req.currentTenant.id);

      if (locationRecord) {
        res.json({
          success: true,
          data: {
            worker_id: workerId,
            location: {
              lat: locationRecord.latitude,
              lng: locationRecord.longitude
            },
            address: locationRecord.address,
            updated_at: locationRecord.updated_at,
            battery_level: locationRecord.battery_level
          }
        });
      } else {
        res.json({
          success: true,
          data: {
            worker_id: workerId,
            location: null,
            address: null,
            updated_at: null,
            battery_level: null
          }
        });
      }
    } catch (error) {
      console.error('获取工人位置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取位置信息失败'
      });
    }
  }

  /**
   * 更新工人位置（由工人端主动上报）
   */
  static async updateWorkerLocation(req, res) {
    try {
      const { lat, lng, accuracy } = req.body;
      const userId = req.user.userId;
      const tenantCode = req.tenantCode;
      const mapService = new MapService();

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: '经纬度不能为空'
        });
      }

      // 验证用户角色
      if (req.user.role !== 'worker') {
        return res.status(403).json({
          success: false,
          message: '只有工人才能更新位置信息'
        });
      }

      // 验证坐标有效性
      if (parseFloat(lat) < -90 || parseFloat(lat) > 90 ||
          parseFloat(lng) < -180 || parseFloat(lng) > 180) {
        return res.status(400).json({
          success: false,
          message: '无效的坐标值'
        });
      }

      // 获取详细地址信息
      const addressInfo = await mapService.reverseGeocode(parseFloat(lat), parseFloat(lng));

      // 保存位置信息到数据库
      await MapController.saveLocationToDB({
        user_id: userId,
        tenant_id: req.currentTenant.id,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        address: addressInfo ? addressInfo.address : '',
        accuracy: accuracy || 0,
        battery_level: req.body.battery_level || null
      });

      res.json({
        success: true,
        message: '位置信息更新成功'
      });
    } catch (error) {
      console.error('更新工人位置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新位置信息失败'
      });
    }
  }

  /**
   * 获取订单轨迹
   */
  static async getOrderTrack(req, res) {
    try {
      const { orderId } = req.params;
      const tenantCode = req.tenantCode;

      // 验证订单权限
      const order = await Order.findById(orderId, tenantCode);
      if (!order || order.tenant_id !== req.currentTenant.id) {
        return res.status(404).json({
          success: false,
          message: '订单不存在'
        });
      }

      // 检查权限 - 只有订单相关人员可以查看轨迹
      if (req.user.role === 'worker' && order.assignee_user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: '无权限查看订单轨迹'
        });
      }

      // 获取订单轨迹数据
      const trackPoints = await MapController.getOrderTrackPoints(orderId, tenantCode);

      res.json({
        success: true,
        data: {
          order_id: orderId,
          track_points: trackPoints
        }
      });
    } catch (error) {
      console.error('获取订单轨迹失败:', error);
      res.status(500).json({
        success: false,
        message: '获取轨迹信息失败'
      });
    }
  }

  // 辅助方法 - 从数据库获取位置信息
  static async getLocationFromDB(workerId, tenantCode, currentTenantId) {
    // 这里应该实现从数据库获取工人位置的逻辑
    // 例如从worker_locations表中获取最新位置记录
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.execute(
        `SELECT user_id, latitude, longitude, address, battery_level, updated_at
         FROM worker_locations
         WHERE user_id = ? AND tenant_id = ?
         ORDER BY updated_at DESC LIMIT 1`,
        [workerId, currentTenantId]
      );

      return rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  // 辅助方法 - 保存位置信息到数据库
  static async saveLocationToDB(locationData) {
    const pool = getTenantConnection(req.tenantCode);
    const connection = await pool.getConnection();

    try {
      await connection.execute(
        `INSERT INTO worker_locations
         (user_id, tenant_id, latitude, longitude, address, accuracy, battery_level, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
         latitude = VALUES(latitude),
         longitude = VALUES(longitude),
         address = VALUES(address),
         accuracy = VALUES(accuracy),
         battery_level = VALUES(battery_level),
         updated_at = NOW()`,
        [
          locationData.user_id,
          locationData.tenant_id,
          locationData.latitude,
          locationData.longitude,
          locationData.address,
          locationData.accuracy,
          locationData.battery_level
        ]
      );
    } finally {
      connection.release();
    }
  }

  // 辅助方法 - 获取订单轨迹点
  static async getOrderTrackPoints(orderId, tenantCode) {
    // 这里应该实现获取订单轨迹点的逻辑
    // 从worker_locations表中获取订单执行期间的位置记录
    const pool = getTenantConnection(tenantCode);
    const connection = await pool.getConnection();

    try {
      const [trackPoints] = await connection.execute(
        `SELECT latitude, longitude, address, updated_at
         FROM worker_locations
         WHERE user_id IN (
           SELECT assignee_user_id FROM orders WHERE id = ?
         ) AND order_id = ?
         ORDER BY updated_at ASC`,
        [orderId, orderId]
      );

      return trackPoints.map(point => ({
        lat: parseFloat(point.latitude),
        lng: parseFloat(point.longitude),
        address: point.address,
        time: point.updated_at
      }));
    } finally {
      connection.release();
    }
  }
}

module.exports = MapController;