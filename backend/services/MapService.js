/**
 * 地图服务配置和接口
 * 集成第三方地图服务，提供地址选择和位置追踪功能
 */

require('dotenv').config();

const axios = require('axios');
const MockMapService = require('./MockMapService');

class MapService {
  constructor() {
    // 检查是否配置了真实的地图API密钥
    this.hasRealAPI = (process.env.AMAP_KEY && process.env.AMAP_KEY !== 'YOUR_AMAP_KEY_HERE') ||
                     (process.env.MAP_API_KEY && process.env.MAP_API_KEY !== 'YOUR_MAP_API_KEY_HERE');

    if (this.hasRealAPI) {
      // 使用真实API
      this.amapKey = process.env.AMAP_KEY || process.env.MAP_API_KEY;
      this.amapGeocodeUrl = 'https://restapi.amap.com/v3/geocode/geo';
      this.amapPlaceSearchUrl = 'https://restapi.amap.com/v3/place/text';
      this.amapDistanceUrl = 'https://restapi.amap.com/v3/distance';
      this.amapRegeoUrl = 'https://restapi.amap.com/v3/geocode/regeo';
    } else {
      // 使用模拟服务
      console.log('[INFO] 未配置真实地图API密钥，使用模拟服务');
      this.mockService = new MockMapService();
    }
  }

  /**
   * 地址搜索和自动补全
   */
  async searchAddress(keyword, city = '全国') {
    if (this.hasRealAPI) {
      try {
        const response = await axios.get(this.amapPlaceSearchUrl, {
          params: {
            key: this.amapKey,
            keywords: keyword,
            city: city,
            citylimit: true,
            offset: 10,
            page: 1
          }
        });

        if (response.data.status === '1' && response.data.pois) {
          return response.data.pois.map(poi => ({
            id: poi.id,
            name: poi.name,
            address: poi.address,
            location: {
              lng: parseFloat(poi.location.split(',')[0]),
              lat: parseFloat(poi.location.split(',')[1])
            },
            adcode: poi.adcode,
            business_area: poi.business_area
          }));
        }
        return [];
      } catch (error) {
        console.error('真实地址搜索失败，使用模拟服务:', error.message);
        return await this.mockService.searchAddress(keyword, city);
      }
    } else {
      // 使用模拟服务
      return await this.mockService.searchAddress(keyword, city);
    }
  }

  /**
   * 地理编码 - 将地址转换为经纬度
   */
  async geocodeAddress(address) {
    if (this.hasRealAPI) {
      try {
        const response = await axios.get(this.amapGeocodeUrl, {
          params: {
            key: this.amapKey,
            address: address
          }
        });

        if (response.data.status === '1' && response.data.geocodes.length > 0) {
          const geocode = response.data.geocodes[0];
          const [lng, lat] = geocode.location.split(',');
          return {
            address: geocode.formatted_address,
            location: {
              lng: parseFloat(lng),
              lat: parseFloat(lat)
            },
            adcode: geocode.adcode
          };
        }
        return null;
      } catch (error) {
        console.error('真实地理编码失败，使用模拟服务:', error.message);
        return await this.mockService.geocodeAddress(address);
      }
    } else {
      // 使用模拟服务
      return await this.mockService.geocodeAddress(address);
    }
  }

  /**
   * 计算两点间距离
   */
  async calculateDistance(origin, destination) {
    if (this.hasRealAPI) {
      try {
        const response = await axios.get(this.amapDistanceUrl, {
          params: {
            key: this.amapKey,
            origins: `${origin.lng},${origin.lat}`,
            destination: `${destination.lng},${destination.lat}`,
            strategy: 0  // 最短距离
          }
        });

        if (response.data.status === '1' && response.data.results.length > 0) {
          return {
            distance: parseFloat(response.data.results[0].distance), // 米
            duration: parseFloat(response.data.results[0].duration)  // 秒
          };
        }
        return null;
      } catch (error) {
        console.error('真实距离计算失败，使用模拟服务:', error.message);
        // 使用模拟服务计算距离
        return await this.mockService.calculateDistance(origin, destination);
      }
    } else {
      // 使用模拟服务
      return await this.mockService.calculateDistance(origin, destination);
    }
  }

  /**
   * 逆地理编码 - 将经纬度转换为地址
   */
  async reverseGeocode(lat, lng) {
    if (this.hasRealAPI) {
      try {
        const response = await axios.get('https://restapi.amap.com/v3/geocode/regeo', {
          params: {
            key: this.amapKey,
            location: `${lng},${lat}`,
            pois: 'all'
          }
        });

        if (response.data.status === '1' && response.data.regeocode) {
          const addr = response.data.regeocode.formatted_address;
          const poi = response.data.regeocode.pois ? response.data.regeocode.pois[0] : null;

          return {
            address: addr,
            poi_name: poi ? poi.name : null,
            poi_type: poi ? poi.type : null,
            adcode: response.data.regeocode.addressComponent.adcode
          };
        }
        return null;
      } catch (error) {
        console.error('真实逆地理编码失败，使用模拟服务:', error.message);
        return await this.mockService.reverseGeocode(lat, lng);
      }
    } else {
      // 使用模拟服务
      return await this.mockService.reverseGeocode(lat, lng);
    }
  }
}

module.exports = MapService;