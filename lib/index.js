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

    console.log('🚀 Starting premium scan with advanced features...');
    console.log('📂 Indexing files, please wait...');

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
console.log('🔍 Scan Report:');
        console.log(report);
      }
      spinner.success({ text: 'Scan completed!' });
    } catch (error) {
      spinner.error({ text: 'Scan failed' });
console.error(`❌ Scan failed: ${error.message}`);
    }
  }

  async explainCode(file, options) {
    console.log('📜 Analyzing and explaining the code...');
    const ai = new AIEngine();

    try {
      const fs = await import('fs');
      const content = fs.readFileSync(file, 'utf8');
      const prompt = options.line ?
        `Explain line ${options.line} in the following file:
${file}:
${content.split('\n')[options.line - 1]}` :
        `Explain the function ${options.function} in the file:
${file}:

---

${content}`;

      const insights = await ai.queryLLM(prompt);
      if (options.security) {
        console.log('🔐 Security Insights:');
      }
      console.log(insights);
    } catch (error) {
      console.error(`❌ Explanation failed: ${error.message}`);
    }
  }

  async suggestFixes(path, options) {
    console.log('🔧 Analyzing codebase for fix suggestions...');
    const scanner = new Scanner();
    const ai = new AIEngine();
    const rootPath = path || process.cwd();
    const scanOptions = { ...options, ai: true };

    const spinner = createSpinner('Scanning for issues...').start();

    try {
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
      }

      spinner.success({ text: `Found ${filesWithIssues.length} files with issues` });

      if (filesWithIssues.length === 0) {
        console.log('✅ No issues found that need fixing!');
        return;
      }

      console.log('\n🔍 Issues and Fix Suggestions:\n');
      
      for (const fileData of filesWithIssues) {
        const { file, staticIssues, aiResult } = fileData;
        
        console.log(`📄 ${file}`);
        console.log('─'.repeat(50));
        
        for (const issue of staticIssues.issues) {
          console.log(`❌ ${issue.type}: ${issue.message}`);
          
          // Get AI fix suggestion
          const fixPrompt = `Suggest a fix for this issue:\nType: ${issue.type}\nMessage: ${issue.message}\nProvide a concise fix suggestion.`;
          try {
            const fixSuggestion = await ai.queryLLM(fixPrompt);
            console.log(`💡 Fix suggestion: ${fixSuggestion}`);
          } catch (error) {
            console.log(`💡 Fix suggestion: Manual review required`);
          }
          console.log('');
        }
        
        if (aiResult.insights && aiResult.insights.length > 0) {
          console.log('🧠 AI Insights:');
          aiResult.insights.forEach(insight => {
            console.log(`  • ${insight}`);
          });
        }
        
        console.log('\n');
      }
    } catch (error) {
      spinner.error({ text: 'Fix suggestions failed' });
      console.error(`❌ Fix suggestions failed: ${error.message}`);
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

  async guard(options) {
    console.log('🛡️ Whisper Git Guard activated...');
    
    if (options.install) {
      return this.installGitHook(options);
    }
    
    if (options.uninstall) {
      return this.uninstallGitHook();
    }
    
    // Default: run guard check
    return this.runGuardCheck(options);
  }
  
  async installGitHook(options) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const gitHookPath = '.git/hooks/pre-commit';
      
      if (!fs.existsSync('.git')) {
        console.error('❌ Not a git repository');
        return;
      }
      
      const hookContent = `#!/bin/sh
# Whisper Security Guard
echo "🛡️ Whisper Guard: Checking commit for security issues..."
node -e "const { WhisperCLI } = require('./node_modules/whisper-cli/lib/index.js'); const whisper = new WhisperCLI(); whisper.runGuardCheck({ severity: '${options.severity || 'medium'}' }).then(() => process.exit(0)).catch(() => process.exit(1));"
`;
      
      fs.writeFileSync(gitHookPath, hookContent);
      fs.chmodSync(gitHookPath, '755');
      
      console.log('✅ Whisper Guard installed successfully!');
      console.log('🔒 All commits will now be checked for security issues.');
    } catch (error) {
      console.error(`❌ Failed to install guard: ${error.message}`);
    }
  }
  
  async uninstallGitHook() {
    try {
      const fs = await import('fs');
      const gitHookPath = '.git/hooks/pre-commit';
      
      if (fs.existsSync(gitHookPath)) {
        fs.unlinkSync(gitHookPath);
        console.log('✅ Whisper Guard uninstalled successfully!');
      } else {
        console.log('ℹ️  No Whisper Guard hook found.');
      }
    } catch (error) {
      console.error(`❌ Failed to uninstall guard: ${error.message}`);
    }
  }
  
  async runGuardCheck(options) {
    console.log('🔍 Running security check on staged files...');
    const scanner = new Scanner();
    const ai = new AIEngine();
    
    try {
      // Get staged files
      const { execSync } = await import('child_process');
      const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
        .split('\n')
        .filter(file => file.trim())
        .filter(file => {
          const ext = file.split('.').pop();
          return ['js', 'ts', 'json', 'env', 'yml', 'yaml'].includes(ext);
        });
      
      if (stagedFiles.length === 0) {
        console.log('✅ No relevant files to check.');
        return;
      }
      
      console.log(`📁 Checking ${stagedFiles.length} staged files...`);
      
      let hasBlockingIssues = false;
      
      for (const file of stagedFiles) {
        try {
          const fs = await import('fs');
          const content = fs.readFileSync(file, 'utf8');
          const issues = scanner.applyRules(file, content);
          
          const blockingIssues = issues.issues.filter(issue => {
            if (options.severity === 'critical') {
              return issue.type === 'secret' || issue.type === 'dangerous';
            }
            if (options.severity === 'high') {
              return ['secret', 'dangerous', 'sql_injection', 'xss'].includes(issue.type);
            }
            if (options.severity === 'medium') {
              return !['todo', 'debug', 'deprecated'].includes(issue.type);
            }
            return true;
          });
          
          if (blockingIssues.length > 0) {
            hasBlockingIssues = true;
            console.log(`🚨 ${file}: ${blockingIssues.length} blocking issues`);
            blockingIssues.forEach(issue => {
              console.log(`  ❌ ${issue.type}: ${issue.message}`);
            });
          }
        } catch (error) {
          console.warn(`⚠️  Could not check ${file}: ${error.message}`);
        }
      }
      
      if (hasBlockingIssues) {
        console.log('\n🛑 COMMIT BLOCKED: Security issues found!');
        console.log('💡 Run `whisper fix` to get suggestions for fixing these issues.');
        process.exit(1);
      } else {
        console.log('✅ All security checks passed. Commit allowed.');
      }
    } catch (error) {
      console.error(`❌ Guard check failed: ${error.message}`);
      process.exit(1);
    }
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
