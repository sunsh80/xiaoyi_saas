/**
 * 简单的OpenAPI规范验证脚本
 * 检查YAML格式和基本结构
 */

const fs = require('fs');
const path = require('path');

// 简单的YAML解析器（仅处理我们需要的结构）
function parseSimpleYAML(content) {
    const lines = content.split('\n');
    const result = { paths: {}, info: {}, openapi: null };
    let currentPath = null;
    let currentMethod = null;
    let inInfoSection = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // 检查基本信息
        if (trimmedLine.startsWith('openapi:')) {
            result.openapi = trimmedLine.split(':')[1].trim();
        }
        if (trimmedLine.startsWith('info:')) {
            inInfoSection = true;
            continue;
        }
        if (inInfoSection && line.startsWith('  ')) { // 两个空格缩进表示info部分
            const content = line.substring(2).trim(); // 移除前两个空格
            if (content.startsWith('title:')) {
                result.info.title = content.split(':')[1].trim().replace(/"/g, '').replace(/'/g, '');
            } else if (content.startsWith('version:')) {
                result.info.version = content.split(':')[1].trim().replace(/"/g, '').replace(/'/g, '');
            } else if (content.startsWith('description:')) {
                result.info.description = content.split(':')[1].trim().replace(/"/g, '').replace(/'/g, '');
            }
        } else if (trimmedLine.match(/^\S/)) { // 非空格开头，退出info部分
            inInfoSection = false;
        }

        // 检查是否是路径定义 (例如: /auth/login:)
        if (trimmedLine.match(/^\/.*:$/)) {
            currentPath = trimmedLine.slice(0, -1); // 移除末尾的冒号
            if (!result.paths) result.paths = {};
            result.paths[currentPath] = {};
        }
        // 检查是否是HTTP方法定义 (例如: get:, post:, put:, delete:)
        else if (trimmedLine.match(/^(get|post|put|delete):$/) && currentPath) {
            currentMethod = trimmedLine.slice(0, -1); // 移除末尾的冒号
            result.paths[currentPath][currentMethod] = {};
        }
    }

    return result;
}

console.log('🔍 验证OpenAPI规范...');

const openApiSpecPath = path.join(__dirname, 'openapi.yaml');
let content;

try {
    content = fs.readFileSync(openApiSpecPath, 'utf8');
    console.log('✅ 成功读取OpenAPI文件');
} catch (error) {
    console.error('❌ 读取OpenAPI文件失败:', error.message);
    process.exit(1);
}

try {
    const spec = parseSimpleYAML(content);
    
    // 验证基本结构
    if (!spec.openapi) {
        console.error('❌ 缺少openapi版本声明');
        process.exit(1);
    }
    
    if (!spec.info.title || !spec.info.version) {
        console.error('❌ 缺少API信息(title或version)');
        process.exit(1);
    }
    
    if (!spec.paths || Object.keys(spec.paths).length === 0) {
        console.error('❌ 缺少API路径定义');
        process.exit(1);
    }
    
    console.log(`✅ OpenAPI版本: ${spec.openapi}`);
    console.log(`✅ API标题: ${spec.info.title}`);
    console.log(`✅ API版本: ${spec.info.version}`);
    console.log(`✅ 定义了 ${Object.keys(spec.paths).length} 个API路径`);
    
    // 列出所有路径
    console.log('\n📋 API路径列表:');
    for (const [path, methods] of Object.entries(spec.paths)) {
        const methodList = Object.keys(methods).join(', ');
        console.log(`   ${path}: ${methodList}`);
    }
    
    console.log('\n✅ OpenAPI规范验证通过');
    
} catch (error) {
    console.error('❌ OpenAPI规范格式错误:', error.message);
    process.exit(1);
}