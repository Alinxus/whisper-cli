export class Reporter {
  generateReport(results, options = {}) {
    const format = options.format || 'markdown';
    const filePath = options.output || null;
    let output = '';

    // Ensure results is an array and each result has issues
    const validResults = results.filter(result => {
      if (!result || typeof result !== 'object') return false;
      if (!Array.isArray(result.issues)) {
        result.issues = [];
      }
      return true;
    });

    switch (format.toLowerCase()) {
      case 'json':
        output = JSON.stringify(validResults, null, 2);
        break;
      case 'csv':
        const headers = ['File', 'Type', 'Message', 'AI Insights'];
        const rows = validResults.flatMap((r) =>
          r.issues.map((i) => [r.file, i.type, i.message, (r.aiResult && r.aiResult.insights) ? r.aiResult.insights.join(' | ') : ''])
        );
        output = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        break;
      case 'html':
        output = '<html><body><h1>Scan Report</h1><ul>' +
          validResults.map(r => `<li><strong>${r.file}</strong><ul>${r.issues.map(i => `<li>[${i.type}] ${i.message}</li>`).join('')}${r.aiResult && r.aiResult.insights ? `<li><em>AI Insights:</em><ul>${r.aiResult.insights.map(ai => `<li>${ai}</li>`).join('')}</ul></li>` : ''}</ul></li>`).join('') +
          '</ul></body></html>';
        break;
      case 'markdown':
      default:
        output = this.generateComprehensiveMarkdown(validResults, options);
        break;
    }

    if (filePath) {
      const fs = require('fs');
      fs.writeFileSync(filePath, output);
      console.log(`✅ Report saved to ${filePath}`);
    } else {
      console.log('\n📄 Generated Report:\n');
      console.log(output);
    }

    return output;
  }

  generateComprehensiveMarkdown(validResults, options = {}) {
    const now = new Date();
    const timestamp = now.toLocaleString();
    const totalFiles = validResults.length;
    const totalIssues = validResults.reduce((sum, r) => sum + r.issues.length, 0);
    const filesWithIssues = validResults.filter(r => r.issues.length > 0).length;
    
    // Calculate severity levels
    const criticalIssues = validResults.reduce((sum, r) => 
      sum + r.issues.filter(i => ['secret', 'dangerous', 'critical'].includes(i.type)).length, 0);
    const highIssues = validResults.reduce((sum, r) => 
      sum + r.issues.filter(i => ['sql_injection', 'xss', 'weak_crypto', 'command_injection'].includes(i.type)).length, 0);
    const mediumIssues = validResults.reduce((sum, r) => 
      sum + r.issues.filter(i => ['insecure_transport', 'deprecated', 'auth_bypass'].includes(i.type)).length, 0);
    const lowIssues = validResults.reduce((sum, r) => 
      sum + r.issues.filter(i => ['todo', 'debug', 'info'].includes(i.type)).length, 0);
    
    // Count issue types
    const issueTypes = {};
    validResults.forEach(r => {
      r.issues.forEach(issue => {
        issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
      });
    });

    let output = '';
    
    // Header
    output += `# 🛡️ Whisper Security Analysis Report\n\n`;
    output += `**Generated:** ${timestamp}  \n`;
    output += `**Scan Type:** Comprehensive Security Analysis  \n`;
    output += `**AI Model:** ${options.model || 'gemini-2.0-flash-exp'}  \n\n`;
    
    // Executive Summary
    output += `## 📊 Executive Summary\n\n`;
    output += `| Metric | Value |\n`;
    output += `|--------|-------|\n`;
    output += `| **Files Scanned** | ${totalFiles} |\n`;
    output += `| **Files with Issues** | ${filesWithIssues} |\n`;
    output += `| **Total Issues Found** | ${totalIssues} |\n`;
    output += `| **Critical Issues** | 🔴 ${criticalIssues} |\n`;
    output += `| **High Issues** | 🟠 ${highIssues} |\n`;
    output += `| **Medium Issues** | 🟡 ${mediumIssues} |\n`;
    output += `| **Low Issues** | 🟢 ${lowIssues} |\n\n`;
    
    // Risk Assessment
    let riskLevel = 'Low';
    let riskColor = '🟢';
    if (criticalIssues > 0) {
      riskLevel = 'Critical';
      riskColor = '🔴';
    } else if (highIssues > 3) {
      riskLevel = 'High';
      riskColor = '🟠';
    } else if (highIssues > 0 || mediumIssues > 5) {
      riskLevel = 'Medium';
      riskColor = '🟡';
    }
    
    output += `### ${riskColor} Overall Risk Level: **${riskLevel}**\n\n`;
    
    if (totalIssues === 0) {
      output += `✅ **Congratulations!** No security issues were detected in your codebase.\n\n`;
      output += `Your code appears to follow security best practices. Consider running periodic scans to maintain this security posture.\n\n`;
    } else {
      // Priority Actions
      output += `## 🚨 Priority Actions\n\n`;
      if (criticalIssues > 0) {
        output += `### Immediate Action Required\n`;
        output += `- 🔴 **${criticalIssues} Critical issues** need immediate attention\n`;
        output += `- These may include hardcoded secrets, dangerous functions, or severe vulnerabilities\n`;
        output += `- **Recommend:** Address before any production deployment\n\n`;
      }
      if (highIssues > 0) {
        output += `### High Priority\n`;
        output += `- 🟠 **${highIssues} High-severity issues** found\n`;
        output += `- May include injection vulnerabilities, authentication bypasses, or crypto weaknesses\n`;
        output += `- **Recommend:** Fix within 1-2 days\n\n`;
      }
      if (mediumIssues > 0) {
        output += `### Medium Priority\n`;
        output += `- 🟡 **${mediumIssues} Medium-severity issues** identified\n`;
        output += `- Address in upcoming development cycles\n\n`;
      }
    }
    
    // Issue Distribution
    if (totalIssues > 0) {
      output += `## 📈 Issue Distribution\n\n`;
      const sortedIssues = Object.entries(issueTypes).sort((a, b) => b[1] - a[1]);
      
      output += `### Top Issue Types\n\n`;
      sortedIssues.slice(0, 10).forEach(([type, count]) => {
        const percentage = ((count / totalIssues) * 100).toFixed(1);
        const displayType = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const severity = this.getIssueSeverityIcon(type);
        output += `- ${severity} **${displayType}**: ${count} issues (${percentage}%)\n`;
      });
      output += `\n`;
    }
    
    // Detailed File Analysis
    output += `## 📁 Detailed File Analysis\n\n`;
    
    if (filesWithIssues === 0) {
      output += `✅ All ${totalFiles} scanned files are clean!\n\n`;
    } else {
      // Group files by severity
      const criticalFiles = validResults.filter(r => 
        r.issues.some(i => ['secret', 'dangerous', 'critical'].includes(i.type)));
      const highFiles = validResults.filter(r => 
        r.issues.some(i => ['sql_injection', 'xss', 'weak_crypto', 'command_injection'].includes(i.type)) &&
        !r.issues.some(i => ['secret', 'dangerous', 'critical'].includes(i.type)));
      const otherFiles = validResults.filter(r => 
        r.issues.length > 0 &&
        !r.issues.some(i => ['secret', 'dangerous', 'critical', 'sql_injection', 'xss', 'weak_crypto', 'command_injection'].includes(i.type)));
      
      if (criticalFiles.length > 0) {
        output += `### 🔴 Critical Issues\n\n`;
        criticalFiles.forEach(result => {
          output += this.generateFileSection(result, 'critical');
        });
      }
      
      if (highFiles.length > 0) {
        output += `### 🟠 High Severity Issues\n\n`;
        highFiles.forEach(result => {
          output += this.generateFileSection(result, 'high');
        });
      }
      
      if (otherFiles.length > 0) {
        output += `### 🟡 Other Issues\n\n`;
        otherFiles.forEach(result => {
          output += this.generateFileSection(result, 'other');
        });
      }
    }
    
    // AI Insights Summary
    const aiInsights = validResults.filter(r => r.aiResult && r.aiResult.insights && r.aiResult.insights.length > 0);
    if (aiInsights.length > 0) {
      output += `## 🧠 AI Security Insights\n\n`;
      output += `The AI analysis identified ${aiInsights.length} files with additional security considerations:\n\n`;
      
      aiInsights.slice(0, 5).forEach(result => {
        const fileName = result.file.split(/[\\/]/).pop();
        output += `### \`${fileName}\`\n\n`;
        if (result.aiResult.insights) {
          result.aiResult.insights.slice(0, 3).forEach(insight => {
            if (insight && insight.trim()) {
              output += `- ${insight.trim()}\n`;
            }
          });
          output += `\n`;
        }
      });
      
      if (aiInsights.length > 5) {
        output += `_... and ${aiInsights.length - 5} more files with AI insights._\n\n`;
      }
    }
    
    // Recommendations
    output += `## 💡 Security Recommendations\n\n`;
    
    if (totalIssues > 0) {
      output += `### Immediate Steps\n`;
      output += `1. **Review Critical Issues**: Address all critical and high-severity findings\n`;
      output += `2. **Run Automated Fixes**: Use \`whisper fix\` for automated remediation suggestions\n`;
      output += `3. **Security Review**: Have a security expert review the findings\n`;
      output += `4. **Test Changes**: Thoroughly test any security fixes before deployment\n\n`;
      
      output += `### Long-term Improvements\n`;
      output += `1. **Pre-commit Hooks**: Install with \`whisper guard --install\`\n`;
      output += `2. **Regular Scans**: Schedule weekly security scans\n`;
      output += `3. **Developer Training**: Educate team on secure coding practices\n`;
      output += `4. **Security Policies**: Establish code security guidelines\n\n`;
    } else {
      output += `### Maintain Security Posture\n`;
      output += `1. **Regular Scanning**: Continue periodic security scans\n`;
      output += `2. **Stay Updated**: Keep dependencies and tools current\n`;
      output += `3. **Security Training**: Ongoing education for development team\n`;
      output += `4. **Monitor Threats**: Stay informed about new security risks\n\n`;
    }
    
    // Clean Files Summary
    const cleanFiles = validResults.filter(r => r.issues.length === 0);
    if (cleanFiles.length > 0) {
      output += `## ✅ Clean Files (${cleanFiles.length})\n\n`;
      output += `<details>\n<summary>View clean files</summary>\n\n`;
      cleanFiles.forEach(result => {
        const fileName = result.file.split(/[\\/]/).pop();
        output += `- \`${fileName}\`\n`;
      });
      output += `\n</details>\n\n`;
    }
    
    // Footer
    output += `---\n\n`;
    output += `**Report generated by Whisper CLI v${options.version || '1.0.0'}**  \n`;
    output += `*Powered by AI Security Intelligence*  \n`;
    output += `*For questions or support, visit: https://github.com/whisper-cli*\n\n`;
    
    return output;
  }

  generateFileSection(result, severity) {
    const fileName = result.file.split(/[\\/]/).pop();
    const relativeFile = result.file.replace(process.cwd(), '.').replace(/\\/g, '/');
    
    let output = `#### \`${fileName}\`\n\n`;
    output += `**Path:** \`${relativeFile}\`  \n`;
    output += `**Issues:** ${result.issues.length}  \n\n`;
    
    // Group issues by type
    const issueGroups = {};
    result.issues.forEach(issue => {
      if (!issueGroups[issue.type]) {
        issueGroups[issue.type] = [];
      }
      issueGroups[issue.type].push(issue);
    });
    
    Object.entries(issueGroups).forEach(([type, issues]) => {
      const displayType = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const icon = this.getIssueSeverityIcon(type);
      
      output += `**${icon} ${displayType}** (${issues.length}):\n`;
      issues.forEach(issue => {
        output += `- ${issue.message}\n`;
        if (issue.line) {
          output += `  - Line: ${issue.line}\n`;
        }
        if (issue.recommendation) {
          output += `  - **Fix:** ${issue.recommendation}\n`;
        }
      });
      output += `\n`;
    });
    
    // Add AI insights for this file
    if (result.aiResult && result.aiResult.insights && result.aiResult.insights.length > 0) {
      output += `**🧠 AI Analysis:**\n`;
      result.aiResult.insights.slice(0, 2).forEach(insight => {
        if (insight && insight.trim()) {
          output += `- ${insight.trim()}\n`;
        }
      });
      output += `\n`;
    }
    
    output += `---\n\n`;
    return output;
  }

  getIssueSeverityIcon(issueType) {
    const criticalTypes = ['secret', 'dangerous', 'critical'];
    const highTypes = ['sql_injection', 'xss', 'weak_crypto', 'command_injection'];
    const mediumTypes = ['insecure_transport', 'deprecated', 'auth_bypass'];
    
    if (criticalTypes.includes(issueType)) return '🔴';
    if (highTypes.includes(issueType)) return '🟠';
    if (mediumTypes.includes(issueType)) return '🟡';
    return '🔵';
  }
}
