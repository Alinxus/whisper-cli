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
        output = '# Whisper Scan Report\n\n';
        if (validResults.length === 0) {
          output += 'No files were scanned or no issues found.\n';
        } else {
          for (const result of validResults) {
            output += `### ${result.file}\n`;
            if (result.issues.length === 0) {
              output += '- No static issues found\n';
            } else {
              for (const issue of result.issues) {
                output += `- **${issue.type}**: ${issue.message}\n`;
              }
            }
            if (result.aiResult && result.aiResult.insights && result.aiResult.insights.length > 0) {
              output += '\n**AI Insights:**\n';
              for (const insight of result.aiResult.insights) {
                output += `- ${insight}\n`;
              }
            }
            output += '\n';
          }
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
