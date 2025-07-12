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
        // Modern aggregated summary instead of per-file output
        if (validResults.length === 0) {
          output = '\n✅ No files were scanned or no issues found.\n';
        } else {
          // Calculate comprehensive statistics
          const totalIssues = validResults.reduce((sum, r) => sum + r.issues.length, 0);
          const filesWithIssues = validResults.filter(r => r.issues.length > 0).length;
          const criticalIssues = validResults.reduce((sum, r) => sum + r.issues.filter(i => i.type === 'secret' || i.type === 'dangerous').length, 0);
          const highIssues = validResults.reduce((sum, r) => sum + r.issues.filter(i => ['sql_injection', 'xss', 'weak_crypto'].includes(i.type)).length, 0);
          const mediumIssues = validResults.reduce((sum, r) => sum + r.issues.filter(i => ['insecure_transport', 'deprecated'].includes(i.type)).length, 0);
          const lowIssues = validResults.reduce((sum, r) => sum + r.issues.filter(i => ['todo', 'debug'].includes(i.type)).length, 0);
          
          // Count issue types
          const issueTypes = {};
          validResults.forEach(r => {
            r.issues.forEach(issue => {
              issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
            });
          });
          
          // Modern clean summary
          output = '\n';
          output += '┌─────────────────────────────────────────────────────────┐\n';
          output += '│                  📊 SECURITY REPORT                     │\n';
          output += '└─────────────────────────────────────────────────────────┘\n\n';
          
          // Key metrics in a clean grid
          output += `📁 Files Scanned: ${validResults.length}\n`;
          output += `⚠️  Files with Issues: ${filesWithIssues}\n`;
          output += `🔍 Total Issues: ${totalIssues}\n\n`;
          
          // Severity breakdown
          if (totalIssues > 0) {
            output += '┌─ SEVERITY BREAKDOWN ─────────────────────────────────────┐\n';
            if (criticalIssues > 0) output += `│ 🔴 Critical: ${criticalIssues.toString().padStart(3)} issues${' '.repeat(41)}│\n`;
            if (highIssues > 0) output += `│ 🟠 High:     ${highIssues.toString().padStart(3)} issues${' '.repeat(41)}│\n`;
            if (mediumIssues > 0) output += `│ 🟡 Medium:   ${mediumIssues.toString().padStart(3)} issues${' '.repeat(41)}│\n`;
            if (lowIssues > 0) output += `│ 🟢 Low:      ${lowIssues.toString().padStart(3)} issues${' '.repeat(41)}│\n`;
            output += '└─────────────────────────────────────────────────────────┘\n\n';
            
            // Top issue types
            const sortedIssues = Object.entries(issueTypes).sort((a, b) => b[1] - a[1]).slice(0, 5);
            if (sortedIssues.length > 0) {
              output += '┌─ TOP ISSUE TYPES ────────────────────────────────────────┐\n';
              sortedIssues.forEach(([type, count]) => {
                const displayType = type.replace(/_/g, ' ').toUpperCase();
                output += `│ ${displayType.padEnd(45)} ${count.toString().padStart(3)} │\n`;
              });
              output += '└─────────────────────────────────────────────────────────┘\n\n';
            }
            
            // Action items
            if (criticalIssues > 0) {
              output += '🚨 IMMEDIATE ACTION REQUIRED:\n';
              output += '   • Review and fix critical security issues\n';
              output += '   • Run `whisper fix` for automated suggestions\n\n';
            }
            
            // Quick tips
            output += '💡 RECOMMENDATIONS:\n';
            if (criticalIssues > 0) output += '   • Remove hardcoded secrets immediately\n';
            if (highIssues > 0) output += '   • Address SQL injection and XSS vulnerabilities\n';
            if (lowIssues > 0) output += '   • Clean up debug logs before production\n';
            output += '   • Run `whisper guard --install` for commit protection\n\n';
          } else {
            output += '✅ No security issues found! Your code looks clean.\n\n';
          }
          
          output += '─'.repeat(57) + '\n';
          output += '🛡️  Powered by Whisper Security Intelligence\n';
        }
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
}
