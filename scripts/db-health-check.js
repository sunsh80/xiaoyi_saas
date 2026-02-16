/**
 * 小蚁搬运数据库健康检查和修复脚本
 * 自动检测并修复常见的数据库连接问题
 */

require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');

async function checkDatabaseConnection() {
  console.log('🔍 检查数据库连接...');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'XIAOYI',
    charset: 'utf8mb4',
    connectTimeout: 10000, // 10秒超时
  };

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功');
    
    // 检查数据库是否存在
    const [databases] = await connection.execute(`SHOW DATABASES LIKE '${config.database}'`);
    if (databases.length === 0) {
      console.log(`❌ 数据库 ${config.database} 不存在`);
      connection.end();
      return false;
    }
    
    console.log(`✅ 数据库 ${config.database} 存在`);
    
    // 检查关键表是否存在
    const tablesToCheck = [
      'users', 'orders', 'referral_campaigns', 'referrals', 'referral_rewards', 'tenants'
    ];
    
    for (const table of tablesToCheck) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table} LIMIT 1`);
        console.log(`✅ 表 ${table} 存在且可访问`);
      } catch (err) {
        console.log(`❌ 表 ${table} 不存在或无法访问:`, err.message);
      }
    }
    
    connection.end();
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

async function initializeDatabaseIfNotExists() {
  console.log('🔧 尝试初始化数据库...');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4'
  };

  try {
    // 使用命令行工具创建数据库，避免预处理语句问题
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    console.log(`🔧 创建数据库 ${(process.env.DB_NAME || 'XIAOYI')}...`);

    const dbName = process.env.DB_NAME || 'XIAOYI';
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '3306';
    const dbUser = process.env.DB_USER || 'xiaoyi_app';
    const dbPassword = process.env.DB_PASSWORD || 'xiaoyi_pass_2023';

    // 使用mysql命令创建数据库
    const createDbCmd = `mysql -h "${dbHost}" -P "${dbPort}" -u "${dbUser}" -p"${dbPassword}" -e "CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`;

    try {
      await execPromise(createDbCmd);
      console.log(`✅ 数据库 ${dbName} 已创建或已存在`);
    } catch (error) {
      // 如果mysql命令不可用，则跳过这一步，让init-db脚本来处理
      console.log(`⚠️  无法使用mysql命令创建数据库，将依赖init-db脚本: ${error.message}`);
    }

    // 运行初始化脚本
    console.log('🏃‍♂️ 运行数据库初始化脚本...');
    try {
      const { stdout, stderr } = await execPromise('npm run init-db');
      if (stderr) {
        console.error('stderr:', stderr);
      }
      console.log('stdout:', stdout);
      console.log('✅ 数据库初始化脚本执行完成');
    } catch (error) {
      console.error('❌ 数据库初始化脚本执行失败:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('❌ 初始化数据库时出错:', error.message);
    return false;
  }
}

async function checkAndFixDatabase() {
  console.log('🏥 开始数据库健康检查和修复...');
  
  // 首先检查数据库连接
  const isConnected = await checkDatabaseConnection();
  
  if (isConnected) {
    console.log('✅ 数据库健康检查通过！');
    return true;
  } else {
    console.log('⚠️ 数据库连接存在问题，尝试修复...');
    
    // 尝试初始化数据库
    const initialized = await initializeDatabaseIfNotExists();
    
    if (initialized) {
      console.log('✅ 数据库修复完成！');
      
      // 再次检查连接
      const isFixed = await checkDatabaseConnection();
      if (isFixed) {
        console.log('✅ 修复后数据库连接正常！');
        return true;
      } else {
        console.error('❌ 修复后数据库仍然无法连接');
        return false;
      }
    } else {
      console.error('❌ 数据库修复失败');
      return false;
    }
  }
}

// 运行检查
checkAndFixDatabase()
  .then(success => {
    if (success) {
      console.log('\n🎉 数据库健康检查和修复完成！');
      process.exit(0);
    } else {
      console.error('\n💥 数据库修复失败，请手动检查配置');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 检查过程中发生错误:', error);
    process.exit(1);
  });