// Main entry for Whisper CLI core logic
import { AuthManager } from './auth/auth.js';
import { ConfigManager } from './config/config.js';
import { Analytics } from './analytics/analytics.js';
import { AIEngine } from './engine/ai.js';
import { Scanner } from './scanner/index.js';
import { Reporter } from './reporter/index.js';

export class WhisperCLI {
  constructor(options = {}) {
    this.options = options;
    this.auth = new AuthManager();
    this.config = new ConfigManager();
    this.analytics = new Analytics();
  }

  async initialize() {
    // Load config, check auth, etc.
    await this.config.load();
    await this.auth.check();
    await this.analytics.init();
  }

  async scan(path, options) {
    const scanner = new Scanner();
    const ai = new AIEngine();
    const reporter = new Reporter();
    const rootPath = path || process.cwd();
    const scanOptions = options || {};
    const files = await scanner.crawl(rootPath, scanOptions);
    const ignorePatterns = scanOptions.ignore ? scanOptions.ignore.split(',') : [];
    const includePatterns = scanOptions.include ? scanOptions.include.split(',') : [];
    const filteredFiles = scanner.filter(files, { ignore: ignorePatterns, include: includePatterns });
    const results = [];
    for (const file of filteredFiles) {
      // Read file content
      let content;
      try {
        content = await import('fs').then(fs => fs.readFileSync(file, 'utf8'));
      } catch (e) {
        console.error('Failed to read', file, e.message);
        continue;
      }
      // Static rules
      const staticIssues = scanner.applyRules(file, content);
      // AI analysis
      let aiResult = {};
      if (scanOptions.ai !== false) {
        aiResult = await ai.analyzeFile(file, content, scanOptions);
      }
      results.push({ file, staticIssues, aiResult });
    }
    // Generate report
    const report = reporter.generateReport(results, scanOptions);
    if (scanOptions.output) {
      await import('fs').then(fs => fs.writeFileSync(scanOptions.output, report, 'utf8'));
      console.log('Report saved to', scanOptions.output);
    } else {
      console.log(report);
    }
  }

  async teamSync(options) {
    // TODO: Implement team sync logic
    console.log('Team sync', options);
  }

  async teamInvite(email, options) {
    // TODO: Implement team invite logic
    console.log('Invite', email, options);
  }

  async pluginInstall(plugin) {
    // TODO: Implement plugin install logic
    console.log('Install plugin', plugin);
  }

  async pluginList() {
    // TODO: Implement plugin list logic
    console.log('List plugins');
  }

  async pluginRemove(plugin) {
    // TODO: Implement plugin remove logic
    console.log('Remove plugin', plugin);
  }

  async chat(options) {
    // TODO: Implement chat mode
    console.log('Chat mode', options);
  }

  async update(options) {
    // TODO: Implement self-update logic
    console.log('Update', options);
  }

  async doctor() {
    // TODO: Implement doctor diagnostics
    console.log('Doctor diagnostics');
  }
} 