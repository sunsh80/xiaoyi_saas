/**
 * 模拟地图服务（用于测试）
 * 当真实地图API不可用时，提供模拟数据
 */

class MockMapService {
  constructor() {
    // 模拟地址数据库
    this.mockAddresses = [
      {
        id: 'mock_beijing_1',
        name: '北京市政府',
        address: '北京市东城区正义路2号',
        location: { lng: 116.403701, lat: 39.905409 },
        adcode: '110000',
        business_area: '天安门'
      },
      {
        id: 'mock_beijing_2',
        name: '北京南站',
        address: '北京市丰台区永定门外大街12号',
        location: { lng: 116.378248, lat: 39.865212 },
        adcode: '110000',
        business_area: '永定门'
      },
      {
        id: 'mock_beijing_3',
        name: '王府井',
        address: '北京市东城区王府井大街',
        location: { lng: 116.418193, lat: 39.915725 },
        adcode: '110000',
        business_area: '王府井'
      },
      {
        id: 'mock_shanghai_1',
        name: '上海中心大厦',
        address: '上海市浦东新区银城中路501号',
        location: { lng: 121.501823, lat: 31.239688 },
        adcode: '310000',
        business_area: '陆家嘴'
      }
    ];
  }

  /**
   * 模拟地址搜索
   */
  async searchAddress(keyword, city = '全国') {
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!keyword) {
      return [];
    }

    // 模拟搜索逻辑
    const results = this.mockAddresses.filter(addr =>
      addr.name.includes(keyword) || addr.address.includes(keyword)
    );

    // 如果没有精确匹配，返回包含关键词的地址
    if (results.length === 0) {
      return this.mockAddresses.filter(addr =>
        addr.name.toLowerCase().includes(keyword.toLowerCase()) ||
        addr.address.toLowerCase().includes(keyword.toLowerCase())
      );
    }

    return results;
  }

  /**
   * 模拟地理编码
   */
  async geocodeAddress(address) {
    await new Promise(resolve => setTimeout(resolve, 100));

    // 模拟地理编码结果
    const mockResult = this.mockAddresses.find(addr => 
      addr.address.includes(address) || addr.name.includes(address)
    );

    if (mockResult) {
      return {
        address: mockResult.address,
        location: mockResult.location,
        adcode: mockResult.adcode
      };
    }

    // 如果没找到精确匹配，返回一个默认位置
    return {
      address: address,
      location: { lng: 116.407170, lat: 39.904694 }, // 天安门坐标
      adcode: '110000'
    };
  }

  /**
   * 模拟距离计算
   */
  async calculateDistance(origin, destination) {
    await new Promise(resolve => setTimeout(resolve, 100));

    // 模拟距离计算（使用简单的估算）
    const latDiff = Math.abs(destination.lat - origin.lat);
    const lngDiff = Math.abs(destination.lng - origin.lng);
    
    // 简单的距离估算（实际应用中应使用更精确的算法）
    const distance = Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 100000);
    const duration = Math.round(distance / 10); // 假设每公里10秒

    return {
      distance: distance, // 米
      duration: duration  // 秒
    };
  }

  /**
   * 模拟逆地理编码
   */
  async reverseGeocode(lat, lng) {
    await new Promise(resolve => setTimeout(resolve, 100));

    // 模拟逆地理编码结果
    return {
      address: `北京市模拟位置(${lat.toFixed(6)}, ${lng.toFixed(6)})`,
      poi_name: '模拟位置',
      poi_type: '住宅区',
      adcode: '110000'
    };
  }
}

module.exports = MockMapService;