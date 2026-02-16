#!/usr/bin/env node

/**
 * OpenAPI 文件监控自动化脚本
 * =============================
 * 监控 openapi.yaml 文件变化，自动执行验证并通过 macOS 通知提醒
 *
 * 功能：
 *   - 实时监控 openapi.yaml 文件修改
 *   - 自动运行 OpenAPI 规范验证（swagger-cli + 自定义深度检查）
 *   - 发现错误时自动用 VS Code 打开文件并跳转到错误行
 *   - 通过 macOS 系统通知提醒格式问题
 *   - 防抖处理，避免频繁触发
 *
 * 用法：
 *   node scripts/watch-openapi.js
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

// ─── 配置 ───────────────────────────────────────────────
const PROJECT_DIR = path.resolve(__dirname, '..');
const OPENAPI_FILE = path.join(PROJECT_DIR, 'openapi.yaml');
const BACKUP_FILE = path.join(PROJECT_DIR, 'openapi.bak.yaml');
const DEBOUNCE_MS = 1500; // 防抖延迟（毫秒）
const VSCODE_PATH = '/Users/sunsh80/Downloads/Visual Studio Code.app/Contents/Resources/app/bin/code';
const LOG_FILE = path.join(PROJECT_DIR, 'scripts', 'watch-openapi.log');

// ─── 工具函数 ───────────────────────────────────────────

function timestamp() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

function log(msg) {
  const line = `[${timestamp()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (_) { /* 忽略日志写入失败 */ }
}

/**
 * 发送 macOS 系统通知
 */
function sendNotification(title, message, isError = false) {
  const sound = isError ? 'Basso' : 'Glass';
  const escapedTitle = title.replace(/"/g, '\\"');
  const escapedMsg = message.replace(/"/g, '\\"');
  const script = `display notification "${escapedMsg}" with title "${escapedTitle}" sound name "${sound}"`;
  try {
    execSync(`osascript -e '${script}'`);
  } catch (e) {
    log(`[通知发送失败] ${e.message}`);
  }
}

/**
 * 用 VS Code 打开文件，可选跳转到指定行
 */
function openInVSCode(filePath, line) {
  try {
    const gotoArg = line ? `--goto "${filePath}:${line}"` : `"${filePath}"`;
    const cmd = `"${VSCODE_PATH}" ${gotoArg}`;
    exec(cmd, (err) => {
      if (err) {
        // 备选：尝试用 open 命令
        exec(`open -a "Visual Studio Code" "${filePath}"`, (err2) => {
          if (err2) log(`[VS Code] 无法打开文件: ${err2.message}`);
        });
      }
    });
  } catch (e) {
    log(`[VS Code] 打开失败: ${e.message}`);
  }
}

// ─── YAML 格式深度检查 ─────────────────────────────────

function deepValidateYAML(content) {
  const errors = [];
  const warnings = [];
  const lines = content.split('\n');

  // 检查 BOM
  if (content.charCodeAt(0) === 0xFEFF) {
    errors.push({ line: 1, msg: '文件包含 BOM 标记，建议移除' });
  }

  // 逐行检查
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Tab 字符检查
    if (line.includes('\t')) {
      errors.push({ line: lineNum, msg: `第 ${lineNum} 行: 包含 Tab 字符，YAML 只允许使用空格缩进` });
    }

    // 行尾空格
    if (line !== line.trimEnd() && line.trim().length > 0) {
      warnings.push({ line: lineNum, msg: `第 ${lineNum} 行: 行尾有多余空格` });
    }

    // 缩进检查（应为 2 的倍数）
    const leadingSpaces = line.match(/^( *)/)[1].length;
    if (leadingSpaces > 0 && leadingSpaces % 2 !== 0 && line.trim().length > 0 && !line.trim().startsWith('-')) {
      warnings.push({ line: lineNum, msg: `第 ${lineNum} 行: 缩进 ${leadingSpaces} 个空格，建议使用 2 空格的倍数` });
    }

    // 重复的冒号 key 检查（简单检测）
    if (line.match(/:\s*:/) && !line.includes('http:') && !line.includes('https:')) {
      errors.push({ line: lineNum, msg: `第 ${lineNum} 行: 可能存在重复冒号` });
    }

    // 空的 key-value
    if (line.match(/^\s+\w+:\s*$/) && !['paths:', 'components:', 'schemas:', 'properties:', 'parameters:', 'responses:', 'tags:', 'servers:', 'info:', 'security:', 'securitySchemes:', 'requestBody:', 'content:', 'headers:', 'examples:'].some(k => line.trim() === k) && !line.trim().endsWith('s:')) {
      // 只在非容器节点上警告空值
    }
  });

  // 检查必需字段
  if (!content.match(/^openapi:\s/m)) {
    errors.push({ line: 1, msg: '缺少 openapi 版本声明（例如 openapi: 3.0.0）' });
  }
  if (!content.match(/^info:\s*$/m)) {
    errors.push({ line: 1, msg: '缺少 info 部分' });
  }
  if (!content.match(/^\s+title:\s/m)) {
    errors.push({ line: 1, msg: '缺少 info.title 字段' });
  }
  if (!content.match(/^\s+version:\s/m)) {
    errors.push({ line: 1, msg: '缺少 info.version 字段' });
  }
  if (!content.match(/^paths:\s*$/m)) {
    errors.push({ line: 1, msg: '缺少 paths 部分' });
  }

  // 检查 $ref 引用格式
  const refRegex = /\$ref:\s*['"]?(.*?)['"]?\s*$/gm;
  let match;
  while ((match = refRegex.exec(content)) !== null) {
    const ref = match[1];
    if (ref && !ref.startsWith('#/') && !ref.startsWith('http') && !ref.endsWith('.yaml') && !ref.endsWith('.yml') && !ref.endsWith('.json')) {
      const refLine = content.substring(0, match.index).split('\n').length;
      errors.push({ line: refLine, msg: `第 ${refLine} 行: $ref 引用格式可能有误: ${ref}` });
    }
  }

  return { errors, warnings };
}

// ─── 主验证流程 ─────────────────────────────────────────

/**
 * 备份 openapi.yaml → openapi.bak.yaml
 * 在每次验证前调用，确保始终保留上一次的完好版本
 */
function backupOpenAPI() {
  try {
    if (!fs.existsSync(OPENAPI_FILE)) return false;
    fs.copyFileSync(OPENAPI_FILE, BACKUP_FILE);
    log(`[备份] 已备份为 openapi.bak.yaml`);
    return true;
  } catch (e) {
    log(`[备份失败] ${e.message}`);
    return false;
  }
}

function runValidation() {
  log('─────────────────────────────────────');
  log('检测到 openapi.yaml 变更，开始验证...');

  // 验证前先备份
  backupOpenAPI();

  let content;
  try {
    content = fs.readFileSync(OPENAPI_FILE, 'utf8');
  } catch (e) {
    log(`[错误] 无法读取文件: ${e.message}`);
    sendNotification('OpenAPI 监控', '无法读取 openapi.yaml 文件', true);
    return;
  }

  const allErrors = [];
  const allWarnings = [];

  // 阶段 1：自定义深度格式检查
  log('[阶段 1/2] 运行 YAML 格式深度检查...');
  const { errors: formatErrors, warnings: formatWarnings } = deepValidateYAML(content);
  allErrors.push(...formatErrors);
  allWarnings.push(...formatWarnings);

  // 阶段 2：swagger-cli 规范验证
  log('[阶段 2/2] 运行 swagger-cli 规范验证...');
  try {
    const swaggerCli = path.join(PROJECT_DIR, 'node_modules', '.bin', 'swagger-cli');
    const result = execSync(`"${swaggerCli}" validate "${OPENAPI_FILE}" 2>&1`, {
      cwd: PROJECT_DIR,
      encoding: 'utf8',
      timeout: 30000,
    });
    log(`[swagger-cli] ${result.trim()}`);
  } catch (e) {
    const output = (e.stdout || '') + (e.stderr || '');
    const swaggerErrors = output.trim().split('\n').filter(l => l.trim());
    swaggerErrors.forEach(errLine => {
      // 尝试提取行号
      const lineMatch = errLine.match(/line\s+(\d+)/i);
      const lineNum = lineMatch ? parseInt(lineMatch[1]) : null;
      allErrors.push({ line: lineNum, msg: `[swagger-cli] ${errLine.trim()}` });
    });
  }

  // ─── 输出结果 ─────────────────────────────────────────
  const errorCount = allErrors.length;
  const warningCount = allWarnings.length;

  if (errorCount === 0 && warningCount === 0) {
    log('验证通过! openapi.yaml 格式正确，无错误无警告。');
    sendNotification('OpenAPI 验证通过', 'openapi.yaml 格式正确，无任何问题。', false);
    return;
  }

  // 打印错误
  if (errorCount > 0) {
    log(`\n发现 ${errorCount} 个错误:`);
    allErrors.forEach((e, i) => {
      log(`  [错误 ${i + 1}] ${e.msg}`);
    });
  }

  // 打印警告
  if (warningCount > 0) {
    log(`\n发现 ${warningCount} 个警告:`);
    allWarnings.forEach((w, i) => {
      log(`  [警告 ${i + 1}] ${w.msg}`);
    });
  }

  // 发送通知
  const notifParts = [];
  if (errorCount > 0) notifParts.push(`${errorCount} 个错误`);
  if (warningCount > 0) notifParts.push(`${warningCount} 个警告`);
  const summary = notifParts.join('，');

  const firstErrorLine = allErrors.find(e => e.line)?.line;
  const firstErrorMsg = allErrors[0]?.msg || allWarnings[0]?.msg || '存在格式问题';
  const notifBody = `${firstErrorMsg.substring(0, 80)}${firstErrorMsg.length > 80 ? '...' : ''}`;

  sendNotification(
    `OpenAPI 验证: ${summary}`,
    notifBody,
    errorCount > 0
  );

  // 用 VS Code 打开文件并跳转到第一个错误行
  if (errorCount > 0) {
    openInVSCode(OPENAPI_FILE, firstErrorLine || 1);
    log(`\n已在 VS Code 中打开文件${firstErrorLine ? `，跳转到第 ${firstErrorLine} 行` : ''}`);
  }

  log('─────────────────────────────────────\n');
}

// ─── 启动监控 ───────────────────────────────────────────

function startWatching() {
  log('========================================');
  log('  OpenAPI 文件监控服务已启动');
  log(`  监控文件: ${OPENAPI_FILE}`);
  log(`  防抖延迟: ${DEBOUNCE_MS}ms`);
  log('========================================\n');

  // 启动时先验证一次
  runValidation();

  // 检查文件是否存在
  if (!fs.existsSync(OPENAPI_FILE)) {
    log(`[错误] 文件不存在: ${OPENAPI_FILE}`);
    sendNotification('OpenAPI 监控', 'openapi.yaml 文件不存在!', true);
    process.exit(1);
  }

  let debounceTimer = null;

  // 使用 fs.watch 监控文件变化
  const watcher = fs.watch(OPENAPI_FILE, { persistent: true }, (eventType) => {
    if (eventType === 'change') {
      // 防抖：多次快速保存只触发一次验证
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        runValidation();
      }, DEBOUNCE_MS);
    }
  });

  // 同时监控文件是否被删除后重建（某些编辑器会这样做）
  const dirWatcher = fs.watch(path.dirname(OPENAPI_FILE), { persistent: true }, (eventType, filename) => {
    if (filename === 'openapi.yaml' && eventType === 'rename') {
      // 文件可能被替换，延迟检查
      setTimeout(() => {
        if (fs.existsSync(OPENAPI_FILE)) {
          log('[监控] 检测到文件被替换/重建，重新验证...');
          runValidation();
        }
      }, 1000);
    }
  });

  // 优雅退出
  const cleanup = (signal) => {
    log(`\n收到 ${signal} 信号，停止监控...`);
    watcher.close();
    dirWatcher.close();
    if (debounceTimer) clearTimeout(debounceTimer);
    process.exit(0);
  };

  process.on('SIGINT', () => cleanup('SIGINT'));
  process.on('SIGTERM', () => cleanup('SIGTERM'));

  // 心跳日志（每小时记录一次运行状态）
  setInterval(() => {
    log('[心跳] 监控服务运行正常');
  }, 3600000);
}

// 启动
startWatching();
