/**
 * 小蚁搬运API测试报告生成器
 * 用于汇总所有测试结果
 */

const fs = require('fs');
const path = require('path');

class TestReportGenerator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      connectivity: null,
      loginFlow: null,
      apiSuite: null,
      summary: {}
    };
  }

  // 读取测试结果文件
  readTestResults() {
    const testDir = path.join(__dirname);
    
    // 尝试读取各个测试的结果
    const connectivityLog = path.join(testDir, 'connectivity-result.log');
    const loginLog = path.join(testDir, 'login-result.log');
    const apiLog = path.join(testDir, 'api-result.log');
    
    if (fs.existsSync(connectivityLog)) {
      this.results.connectivity = this.parseTestResult(fs.readFileSync(connectivityLog, 'utf8'), 'connectivity');
    }
    
    if (fs.existsSync(loginLog)) {
      this.results.loginFlow = this.parseTestResult(fs.readFileSync(loginLog, 'utf8'), 'login');
    }
    
    if (fs.existsSync(apiLog)) {
      this.results.apiSuite = this.parseTestResult(fs.readFileSync(apiLog, 'utf8'), 'api');
    }
    
    this.generateSummary();
  }

  // 解析测试结果
  parseTestResult(logContent, testType) {
    const lines = logContent.split('\n');
    let passed = false;
    let details = [];
    
    for (const line of lines) {
      if (line.includes('✅') || line.includes('通过') || line.includes('SUCCESS')) {
        passed = true;
      }
      if (line.trim() !== '') {
        details.push(line.trim());
      }
    }
    
    return {
      passed,
      details: details.slice(-10), // 只取最后10行作为详情
      raw: logContent
    };
  }

  // 生成摘要
  generateSummary() {
    this.results.summary = {
      totalTests: 3,
      passedTests: [
        this.results.connectivity?.passed ? 1 : 0,
        this.results.loginFlow?.passed ? 1 : 0,
        this.results.apiSuite?.passed ? 1 : 0
      ].reduce((a, b) => a + b, 0),
      failedTests: 3 - [
        this.results.connectivity?.passed ? 1 : 0,
        this.results.loginFlow?.passed ? 1 : 0,
        this.results.apiSuite?.passed ? 1 : 0
      ].reduce((a, b) => a + b, 0),
      status: 'PARTIAL' // 默认状态
    };

    if (this.results.summary.passedTests === 3) {
      this.results.summary.status = 'PASS';
    } else if (this.results.summary.failedTests === 3) {
      this.results.summary.status = 'FAIL';
    }
  }

  // 生成HTML报告
  generateHTMLReport() {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>小蚁搬运API测试报告</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #00BCD4, #0097A7);
      color: white;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
      margin-bottom: 30px;
    }
    .summary-card {
      background: white;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .status-badge {
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: bold;
      margin-left: 10px;
    }
    .status-pass {
      background-color: #4CAF50;
      color: white;
    }
    .status-fail {
      background-color: #F44336;
      color: white;
    }
    .status-partial {
      background-color: #FF9800;
      color: white;
    }
    .test-section {
      background: white;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .test-result {
      margin: 10px 0;
      padding: 10px;
      border-radius: 5px;
    }
    .result-pass {
      background-color: #e8f5e8;
      border-left: 4px solid #4CAF50;
    }
    .result-fail {
      background-color: #ffeaea;
      border-left: 4px solid #F44336;
    }
    .details {
      background-color: #f8f9fa;
      border-radius: 5px;
      padding: 10px;
      margin-top: 10px;
      font-family: monospace;
      font-size: 12px;
      max-height: 200px;
      overflow-y: auto;
    }
    .timestamp {
      color: #666;
      font-size: 14px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>小蚁搬运API测试报告</h1>
    <p>自动化API测试结果汇总</p>
    <div class="timestamp">生成时间: ${new Date(this.results.timestamp).toLocaleString()}</div>
  </div>

  <div class="summary-card">
    <h2>测试摘要 <span class="status-badge status-${this.results.summary.status.toLowerCase()}">${this.results.summary.status}</span></h2>
    <p><strong>总体状态:</strong> ${this.results.summary.status === 'PASS' ? '✅ 全部通过' : this.results.summary.status === 'FAIL' ? '❌ 全部失败' : '⚠️ 部分通过'}</p>
    <p><strong>测试项目:</strong> ${this.results.summary.passedTests}/${this.results.summary.totalTests} 通过</p>
    <p><strong>连通性测试:</strong> ${this.results.connectivity ? (this.results.connectivity.passed ? '✅ 通过' : '❌ 失败') : '⏳ 未运行'}</p>
    <p><strong>登录流程测试:</strong> ${this.results.loginFlow ? (this.results.loginFlow.passed ? '✅ 通过' : '❌ 失败') : '⏳ 未运行'}</p>
    <p><strong>API套件测试:</strong> ${this.results.apiSuite ? (this.results.apiSuite.passed ? '✅ 通过' : '❌ 失败') : '⏳ 未运行'}</p>
  </div>

  ${this.results.connectivity ? `
  <div class="test-section">
    <h2>连通性测试结果</h2>
    <div class="test-result ${this.results.connectivity.passed ? 'result-pass' : 'result-fail'}">
      状态: ${this.results.connectivity.passed ? '✅ 通过' : '❌ 失败'}
    </div>
    <div class="details">
      <pre>${this.results.connectivity.details.join('\n')}</pre>
    </div>
  </div>
  ` : ''}

  ${this.results.loginFlow ? `
  <div class="test-section">
    <h2>登录流程测试结果</h2>
    <div class="test-result ${this.results.loginFlow.passed ? 'result-pass' : 'result-fail'}">
      状态: ${this.results.loginFlow.passed ? '✅ 通过' : '❌ 失败'}
    </div>
    <div class="details">
      <pre>${this.results.loginFlow.details.join('\n')}</pre>
    </div>
  </div>
  ` : ''}

  ${this.results.apiSuite ? `
  <div class="test-section">
    <h2>API套件测试结果</h2>
    <div class="test-result ${this.results.apiSuite.passed ? 'result-pass' : 'result-fail'}">
      状态: ${this.results.apiSuite.passed ? '✅ 通过' : '❌ 失败'}
    </div>
    <div class="details">
      <pre>${this.results.apiSuite.details.join('\n')}</pre>
    </div>
  </div>
  ` : ''}

  <div class="summary-card">
    <h2>测试建议</h2>
    ${this.results.summary.status === 'PASS' ? `
    <p>✅ 恭喜！所有API测试均已通过。系统运行稳定，可以进行下一步部署。</p>
    <p>建议定期运行自动化测试以确保系统稳定性。</p>
    ` : this.results.summary.status === 'FAIL' ? `
    <p>❌ 测试发现严重问题，请立即检查API服务状态。</p>
    <p>建议优先解决连通性问题，然后重新运行测试。</p>
    ` : `
    <p>⚠️ 部分测试未通过，需要进一步调查问题原因。</p>
    <p>建议检查失败的测试项目并修复相关问题。</p>
    `}
  </div>
</body>
</html>`;

    return html;
  }

  // 保存报告
  saveReport() {
    const htmlReport = this.generateHTMLReport();
    const reportPath = path.join(__dirname, '..', 'test-report.html');
    fs.writeFileSync(reportPath, htmlReport);
    console.log(`📊 测试报告已保存至: ${reportPath}`);
    return reportPath;
  }

  // 运行完整报告生成
  run() {
    this.readTestResults();
    return this.saveReport();
  }
}

// 运行报告生成器
if (require.main === module) {
  const generator = new TestReportGenerator();
  generator.run();
}

module.exports = TestReportGenerator;