// Main entry for Whisper CLI core logic
import { AuthManager } from './auth/auth.js';
import { ConfigManager } from './config/config.js';
import { Analytics } from './analytics/analytics.js';
import { AIEngine } from './engine/ai.js';
import { Scanner } from './scanner/index.js';
import { Reporter } from './reporter/index.js';
import { PluginManager } from './plugins/index.js';

export class WhisperCLI {
  constructor(options = {}) {
    this.options = options;
    this.auth = new AuthManager();
    this.config = new ConfigManager();
    this.analytics = new Analytics();
    this.plugins = new PluginManager();
  }

  async initialize() {
    await this.config.load();
    await this.auth.check();
    await this.analytics.init();
    await this.plugins.load();
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
      let content;
      try {
        content = await import('fs').then(fs => fs.readFileSync(file, 'utf8'));
      } catch (e) {
        console.error(`❌ Failed to read ${file}: ${e.message}`);
        continue;
      }

      const staticIssues = scanner.applyRules(file, content);

      let aiResult = {};
      if (scanOptions.ai !== false) {
        try {
          aiResult = await ai.analyzeFile(file, content, scanOptions);
        } catch (e) {
          console.error(`⚠️  AI analysis failed for ${file}: ${e.message}`);
        }
      }

      results.push({ file, staticIssues, aiResult });
    }

    const report = reporter.generateReport(results, scanOptions);
    if (scanOptions.output) {
      await import('fs').then(fs => fs.writeFileSync(scanOptions.output, report, 'utf8'));
      console.log(`📄 Report saved to ${scanOptions.output}`);
    } else {
      console.log(report);
    }
  }

  async teamSync(options) {
    console.log('🔄 Team sync initiated with options:', options);
    // Future: push local usage metrics and configurations to cloud dashboard
  }

  async teamInvite(email, options) {
    console.log(`✉️  Inviting ${email} with role ${options.role || 'member'}`);
    // Future: API call to backend invitation endpoint
  }

  async pluginInstall(plugin) {
    await this.plugins.install(plugin);
  }

  async pluginList() {
    await this.plugins.list();
  }

  async pluginRemove(plugin) {
    await this.plugins.remove(plugin);
  }

  async chat(options) {
    const ai = new AIEngine();
    await ai.interactiveChat(options);
  }

  async update(options) {
    console.log('⬆️  Checking for updates...');
    // Future: Auto-update logic from GitHub/NPM releases
  }

  async doctor() {
    console.log('🩺 Running system diagnostics...');
    const checks = [
      { name: 'Node.js Version', value: process.version },
      { name: 'Platform', value: process.platform },
      { name: 'User Config Path', value: this.config.configPath }
    ];
    for (const check of checks) {
      console.log(`✅ ${check.name}: ${check.value}`);
    }
  }
}
