export class Reporter {
  generateReport(results, options = {}) {
    const format = options.format || 'markdown';
    const filePath = options.output || null;
    let output = '';

    switch (format.toLowerCase()) {
      case 'json':
        output = JSON.stringify(results, null, 2);
        break;
      case 'csv':
        const headers = ['File', 'Type', 'Message'];
        const rows = results.flatMap((r) =>
          r.issues.map((i) => [r.file, i.type, i.message])
        );
        output = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        break;
      case 'html':
        output = '<html><body><h1>Scan Report</h1><ul>' +
          results.map(r => `<li><strong>${r.file}</strong><ul>${r.issues.map(i => `<li>[${i.type}] ${i.message}</li>`).join('')}</ul></li>`).join('') +
          '</ul></body></html>';
        break;
      case 'markdown':
      default:
        output = '# Whisper Scan Report\n\n';
        for (const result of results) {
          output += `### ${result.file}\n`;
          for (const issue of result.issues) {
            output += `- **${issue.type}**: ${issue.message}\n`;
          }
          output += '\n';
        }
        break;
    }

    if (filePath) {
      writeFileSync(filePath, output);
      console.log(chalk.green(`✅ Report saved to ${filePath}`));
    } else {
      console.log(chalk.blue('\n📄 Generated Report:\n'));
      console.log(output);
    }

    return output;
  }
}
