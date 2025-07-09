// Main entry for Whisper CLI core logic
import { AuthManager } from './auth/auth.js';
import { ConfigManager } from './config/config.js';
import { Analytics } from './analytics/analytics.js';
import { AIEngine } from './engine/ai.js';
import { Scanner } from './scanner/index.js';
import { Reporter } from './reporter/index.js';
import { PluginManager } from './plugins/index.js';
import {createSpinner} from 'nanospinner'

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

    const spinner = createSpinner('Scanning codebase...').start();

    try {
      const files = await scanner.crawl(rootPath, scanOptions);
      const ignorePatterns = scanOptions.ignore ? scanOptions.ignore.split(',') : [];
      const includePatterns = scanOptions.include ? scanOptions.include.split(',') : [];
      const filteredFiles = scanner.filter(files, { ignore: ignorePatterns, include: includePatterns });

      const results = [];

      for (const file of filteredFiles) {
        // Check if file exists and is not a directory
        const fs = await import('fs');
        try {
          const stats = fs.statSync(file);
          if (!stats.isFile()) {
            console.log(`⏭️  Skipping directory: ${file}`);
            continue;
          }
        } catch (e) {
          console.error(`❌ Failed to stat ${file}: ${e.message}`);
          continue;
        }

        let content;
        try {
          content = fs.readFileSync(file, 'utf8');
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

        // Format the result to match what the reporter expects
        results.push({
          file,
          issues: staticIssues.issues || [],
          hash: staticIssues.hash,
          aiResult
        });
      }

      const report = reporter.generateReport(results, scanOptions);
      if (scanOptions.output) {
        const fs = await import('fs');
        fs.writeFileSync(scanOptions.output, report, 'utf8');
        console.log(`📄 Report saved to ${scanOptions.output}`);
      } else {
        console.log(report);
      }
      spinner.success({ text: 'Scan completed!' });
    } catch (error) {
      spinner.error({ text: 'Scan failed' });
      console.error(`Scan failed: ${error.message}`);
    }
  }

  async fixSecurityIssues(options = {}) {
    const spinner = createSpinner('Scanning for security issues...').start();
    
    try {
      // First, run a scan to find issues
      const scanner = new Scanner();
      const ai = new AIEngine();
      const rootPath = process.cwd();
      const scanOptions = { ...options, ai: true }; // Enable AI analysis

      const files = await scanner.crawl(rootPath, scanOptions);
      const filteredFiles = scanner.filter(files, { ignore: [], include: [] });

      const results = [];
      const filesWithIssues = [];

      for (const file of filteredFiles) {
        const fs = await import('fs');
        try {
          const stats = fs.statSync(file);
          if (!stats.isFile()) continue;
        } catch (e) {
          continue;
        }

        let content;
        try {
          content = fs.readFileSync(file, 'utf8');
        } catch (e) {
          continue;
        }

        const staticIssues = scanner.applyRules(file, content);
        const aiResult = await ai.analyzeFile(file, content, scanOptions);

        if (staticIssues.issues.length > 0 || (aiResult.insights && aiResult.insights.length > 0)) {
          filesWithIssues.push({
            file,
            content,
            staticIssues,
            aiResult
          });
        }

        results.push({
          file,
          issues: staticIssues.issues || [],
          hash: staticIssues.hash,
          aiResult
        });
      }

      spinner.success({ text: `Found ${filesWithIssues.length} files with issues` });

      if (filesWithIssues.length === 0) {
        console.log('✅ No security issues found!');
        return;
      }

      // Now use AI to suggest and apply fixes
      const fixSpinner = createSpinner('AI analyzing and fixing issues...').start();
      
      for (const fileData of filesWithIssues) {
        const { file, content, staticIssues, aiResult } = fileData;
        
        // Create a comprehensive prompt for fixing issues
        const issuesList = staticIssues.issues.map(issue => `- ${issue.type}: ${issue.message}`).join('\n');
        const aiInsights = aiResult.insights ? aiResult.insights.join('\n') : '';
        
        const fixPrompt = `You are an expert security code reviewer. The following file has security issues that need to be fixed:

File: ${file}

Current Issues:
${issuesList}

AI Insights:
${aiInsights}

Current Code:
${content}

Please provide the corrected code that fixes all security issues. Return ONLY the corrected code, no explanations.`;

        try {
          const fixedCode = await ai.queryLLM(fixPrompt);
          
          // Apply the fix
          const fs = await import('fs');
          fs.writeFileSync(file, fixedCode, 'utf8');
          
          console.log(`✅ Fixed security issues in: ${file}`);
        } catch (error) {
          console.error(`❌ Failed to fix ${file}: ${error.message}`);
        }
      }

      fixSpinner.success({ text: 'Security fixes applied!' });
      console.log(`🎉 Fixed security issues in ${filesWithIssues.length} files`);
      
    } catch (error) {
      spinner.error({ text: 'Security fix failed' });
      console.error(`Security fix failed: ${error.message}`);
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
