// Main entry for Whisper CLI core logic
import { AuthManager } from './auth/auth.js';
import { ConfigManager } from './config/config.js';
import { Analytics } from './analytics/analytics.js';
import { AIEngine } from './engine/ai.js';
import { Scanner } from './scanner/index.js';
import { Reporter } from './reporter/index.js';
import { PluginManager } from './plugins/index.js';
import {createSpinner} from 'nanospinner'
import chalk from 'chalk';
import axios from 'axios';

const BASE_URL = process.env.WHISPER_API_URL || 'http://localhost:3000/api/v1';

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
    await this.analytics.init();
    await this.plugins.load();
}

  async checkRateLimits() {
    // Simulate rate limit check
    console.log(chalk.gray('Checking rate limits...'));
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async scan(path, options) {
    // Check authentication first
    const isAuthenticated = await this.auth.check();
    if (!isAuthenticated) {
      console.log(chalk.yellow('⚠️  Authentication required for enhanced scanning.'));
      console.log(chalk.cyan('Run `whisper auth login` to access all features.'));
      return;
    }

    const scanner = new Scanner();
    const token = await this.auth.getToken();
    const ai = new AIEngine({ authToken: token });
    const reporter = new Reporter();
    const rootPath = path || process.cwd();
    const scanOptions = options || {};

    // Modern clean output
    console.clear();
    console.log('\n' + '═'.repeat(60));
    console.log('  🛡️  W H I S P E R   S E C U R I T Y   S C A N');
    console.log('═'.repeat(60));
    
    const indexSpinner = createSpinner('🔍 Indexing files...').start();
    
    try {
      // Check scan limits with backend
      const token = await this.auth.getToken();
      const checkResponse = await this.checkScanLimits(token);
      
      if (!checkResponse.success) {
        indexSpinner.error({ text: 'Scan limit exceeded' });
        console.log(chalk.red(`\n❌ ${checkResponse.message}`));
        console.log(chalk.cyan('💡 Consider upgrading your plan for more scans: https://whisper-cli.dev/pricing'));
        return;
      }
      
      const files = await scanner.crawl(rootPath, scanOptions);
      const ignorePatterns = scanOptions.ignore ? scanOptions.ignore.split(',') : [];
      const includePatterns = scanOptions.include ? scanOptions.include.split(',') : [];
      const filteredFiles = scanner.filter(files, { ignore: ignorePatterns, include: includePatterns });
      
      // Check file count against plan limits
      if (checkResponse.limits && filteredFiles.length > checkResponse.limits.maxFilesPerRepo) {
        indexSpinner.error({ text: 'File limit exceeded' });
        console.log(chalk.red(`\n❌ Repository has ${filteredFiles.length} files, but your plan allows maximum ${checkResponse.limits.maxFilesPerRepo} files.`));
        console.log(chalk.cyan('💡 Consider upgrading your plan or scanning a smaller subset of files.'));
        return;
      }
      
      indexSpinner.success({ text: `📁 Found ${filteredFiles.length} files to analyze` });
      
      const scanSpinner = createSpinner('🔎 Analyzing security patterns...').start();
      const results = [];
      let processedCount = 0;
      
      for (const file of filteredFiles) {
        const fs = await import('fs');
        try {
          const stats = fs.statSync(file);
          if (!stats.isFile()) continue;
          
          const content = fs.readFileSync(file, 'utf8');
          const staticIssues = await scanner.applyRules(file, content, rootPath);
          
          let aiResult = {};
          if (scanOptions.ai !== false && checkResponse.limits?.aiFixesEnabled) {
            try {
              aiResult = await ai.analyzeFile(file, content, scanOptions);
            } catch (e) {
              // Silent fail for AI analysis
            }
          }
          
          results.push({
            file,
            issues: staticIssues.issues || [],
            hash: staticIssues.hash,
            confidence: staticIssues.confidence,
            lens: staticIssues.lens,
            aiResult
          });
          
          processedCount++;
          // Update spinner with progress
          scanSpinner.text = `🔎 Analyzing security patterns... ${processedCount}/${filteredFiles.length}`;
          
        } catch (e) {
          // Silent fail for individual files
        }
      }
      
      scanSpinner.success({ text: `✅ Security analysis complete` });
      
      // Upload scan results to backend
      if (scanOptions.upload !== false) {
        await this.uploadScanResults(results, rootPath, token);
      }
      
      const report = reporter.generateReport(results, scanOptions);
      if (scanOptions.output) {
        const fs = await import('fs');
        fs.writeFileSync(scanOptions.output, report, 'utf8');
        console.log(`\n📄 Report saved to ${scanOptions.output}`);
      } else {
        console.log(report);
      }
      
    } catch (error) {
      console.error(`\n❌ Scan failed: ${error.message}`);
      if (error.response?.status === 429) {
        console.log(chalk.cyan('💡 You have reached your scan limit. Upgrade your plan or wait until next month.'));
      }
    }
  }

  async explainCode(file, options) {
    console.log('📜 Analyzing and explaining the code...');
    const token = await this.auth.getToken();
    const ai = new AIEngine({ authToken: token });

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
    const token = await this.auth.getToken();
    const ai = new AIEngine({ authToken: token });
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

        const staticIssues = await scanner.applyRules(file, content);
        const aiResult = await ai.analyzeFile(file, content, scanOptions);

        if ((staticIssues?.issues && staticIssues.issues.length > 0) || (aiResult?.insights && aiResult.insights.length > 0)) {
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
        
        if (staticIssues?.issues && staticIssues.issues.length > 0) {
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

        const staticIssues = await scanner.applyRules(file, content);
        const aiResult = await ai.analyzeFile(file, content, scanOptions);

        if ((staticIssues?.issues && staticIssues.issues.length > 0) || (aiResult?.insights && aiResult.insights.length > 0)) {
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

  async checkScanLimits(token) {
    try {
      const response = await axios.get(`${BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const user = response.data.user;
      const subscription = user.subscription;
      
      if (!subscription) {
        return {
          success: false,
          message: 'No active subscription found. Please subscribe to a plan.'
        };
      }
      
      // Check if user has reached scan limit
      if (subscription.scansUsed >= subscription.scansLimit && subscription.scansLimit !== -1) {
        return {
          success: false,
          message: `You have reached your monthly limit of ${subscription.scansLimit} scans.`,
          currentUsage: subscription.scansUsed,
          limit: subscription.scansLimit
        };
      }
      
      return {
        success: true,
        limits: {
          scansPerMonth: subscription.scansLimit,
          scansUsed: subscription.scansUsed,
          aiFixesEnabled: subscription.plan !== 'FREE',
          maxFilesPerRepo: this.getPlanFileLimits(subscription.plan)
        }
      };
    } catch (error) {
      console.warn('Could not check scan limits with backend, proceeding with local scan...');
      return {
        success: true,
        limits: {
          maxFilesPerRepo: 2500, // Default to free plan limits
          aiFixesEnabled: false
        }
      };
    }
  }
  
  getPlanFileLimits(plan) {
    const limits = {
      FREE: 2500,
      PRO: 10000,
      TEAM: 20000,
      ENTERPRISE: -1 // Unlimited
    };
    return limits[plan] || 2500;
  }
  
  async uploadScanResults(results, rootPath, token) {
    try {
      const uploadSpinner = createSpinner('Uploading scan results...').start();
      
      const scanData = {
        projectPath: rootPath,
        totalFiles: results.length,
        issuesFound: results.reduce((total, result) => total + result.issues.length, 0),
        findings: results.map(result => ({
          file: result.file,
          issues: result.issues,
          confidence: result.confidence,
          lens: result.lens
        })),
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      
      await axios.post(`${BASE_URL}/scans`, scanData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      uploadSpinner.success({ text: 'Scan results uploaded successfully' });
    } catch (error) {
      console.warn('Failed to upload scan results:', error.message);
    }
  }
  
  async runGuardCheck(options) {
    console.log('🔍 Running security check on staged files...');
    const scanner = new Scanner();
    
    try {
      // Check if we're in a git repository
      const { execSync } = await import('child_process');
      
      try {
        execSync('git rev-parse --git-dir', { stdio: 'ignore' });
      } catch (error) {
        console.error('❌ Not a git repository');
        process.exit(1);
      }
      
      // Get staged files
      let stagedFiles;
      try {
        stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
          .split('\n')
          .filter(file => file.trim())
          .filter(file => {
            const ext = file.split('.').pop();
            return ['js', 'ts', 'jsx', 'tsx', 'json', 'env', 'yml', 'yaml', 'py', 'java', 'go', 'rs', 'php', 'rb'].includes(ext);
          });
      } catch (error) {
        console.log('✅ No staged files to check.');
        return;
      }
      
      if (stagedFiles.length === 0) {
        console.log('✅ No relevant staged files to check.');
        return;
      }
      
      console.log(`📁 Checking ${stagedFiles.length} staged files...`);
      
      let hasBlockingIssues = false;
      let totalIssues = 0;
      
      for (const file of stagedFiles) {
        try {
          const fs = await import('fs');
          const { existsSync } = fs;
          
          if (!existsSync(file)) {
            continue; // Skip deleted files
          }
          
          const content = fs.readFileSync(file, 'utf8');
          const result = await scanner.applyRules(file, content);
          
          const blockingIssues = result.issues.filter(issue => {
            if (options.severity === 'critical') {
              return issue.severity === 'critical';
            }
            if (options.severity === 'high') {
              return ['critical', 'high'].includes(issue.severity);
            }
            if (options.severity === 'medium') {
              return ['critical', 'high', 'medium'].includes(issue.severity);
            }
            return true; // low includes all
          });
          
          if (blockingIssues.length > 0) {
            hasBlockingIssues = true;
            totalIssues += blockingIssues.length;
            console.log(chalk.red(`🚨 ${file}: ${blockingIssues.length} blocking issues`));
            
            blockingIssues.forEach(issue => {
              const severityIcon = {
                critical: '🔴',
                high: '🟠',
                medium: '🟡',
                low: '🔵'
              }[issue.severity] || '⚪';
              
              console.log(chalk.red(`  ${severityIcon} ${issue.type}: ${issue.message}`));
              if (issue.line) {
                console.log(chalk.gray(`    Line ${issue.line}${issue.column ? `:${issue.column}` : ''}`));
              }
              if (issue.fix) {
                console.log(chalk.cyan(`    💡 Fix: ${issue.fix}`));
              }
            });
          }
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Could not check ${file}: ${error.message}`));
        }
      }
      
      if (hasBlockingIssues) {
        console.log('');
        console.log(chalk.red('🛑 COMMIT BLOCKED: Security issues found!'));
        console.log(chalk.yellow(`📊 Found ${totalIssues} security issues across ${stagedFiles.length} files`));
        console.log('');
        console.log(chalk.cyan('💡 To fix these issues:'));
        console.log(chalk.cyan('   • Run `whisper scan --fix` to get AI-powered fix suggestions'));
        console.log(chalk.cyan('   • Run `whisper explain <file>` to understand specific issues'));
        console.log(chalk.cyan('   • Use `git commit --no-verify` to bypass (not recommended)'));
        console.log('');
        process.exit(1);
      } else {
        console.log(chalk.green('✅ All security checks passed. Commit allowed.'));
        console.log(chalk.gray(`📊 Scanned ${stagedFiles.length} files with no security issues`));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Guard check failed: ${error.message}`));
      process.exit(1);
    }
  }
  
  async installGitHook(options) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { existsSync, mkdirSync, writeFileSync, chmodSync } = fs;
      
      if (!existsSync('.git')) {
        console.error(chalk.red('❌ Not a git repository'));
        console.log(chalk.yellow('💡 Run `git init` to initialize a git repository first'));
        return;
      }
      
      const hooksDir = '.git/hooks';
      const gitHookPath = path.join(hooksDir, 'pre-commit');
      
      // Create hooks directory if it doesn't exist
      if (!existsSync(hooksDir)) {
        mkdirSync(hooksDir, { recursive: true });
      }
      
      // Check if pre-commit hook already exists
      if (existsSync(gitHookPath)) {
        const existingContent = fs.readFileSync(gitHookPath, 'utf8');
        if (existingContent.includes('Whisper Security Guard')) {
          console.log(chalk.yellow('⚠️  Whisper Guard is already installed'));
          return;
        } else {
          console.log(chalk.yellow('⚠️  A pre-commit hook already exists'));
          const { default: inquirer } = await import('inquirer');
          const { overwrite } = await inquirer.prompt([{
            type: 'confirm',
            name: 'overwrite',
            message: 'Do you want to overwrite the existing pre-commit hook?',
            default: false
          }]);
          
          if (!overwrite) {
            console.log(chalk.gray('Installation cancelled'));
            return;
          }
        }
      }
      
      const hookContent = `#!/bin/sh
# Whisper Security Guard
echo "🛡️  Whisper Guard: Checking commit for security issues..."

# Run Whisper security check
if command -v whisper >/dev/null 2>&1; then
    whisper guard --severity ${options.severity || 'medium'}
else
    echo "❌ Whisper CLI not found. Please install it first."
    exit 1
fi`;
      
      writeFileSync(gitHookPath, hookContent);
      
      // Make the hook executable (Unix/Linux/macOS)
      if (process.platform !== 'win32') {
        chmodSync(gitHookPath, '755');
      }
      
      console.log(chalk.green('✅ Whisper Guard installed successfully!'));
      console.log(chalk.blue('🔒 All commits will now be checked for security issues'));
      console.log(chalk.gray(`📝 Severity level: ${options.severity || 'medium'}`));
      console.log('');
      console.log(chalk.cyan('To test the guard:'));
      console.log(chalk.cyan('  1. Stage some files: `git add .`'));
      console.log(chalk.cyan('  2. Try to commit: `git commit -m "test"`'));
      console.log('');
    } catch (error) {
      console.error(chalk.red(`❌ Failed to install guard: ${error.message}`));
    }
  }
  
  async uninstallGitHook() {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { existsSync, unlinkSync } = fs;
      
      const gitHookPath = path.join('.git', 'hooks', 'pre-commit');
      
      if (existsSync(gitHookPath)) {
        const content = fs.readFileSync(gitHookPath, 'utf8');
        if (content.includes('Whisper Security Guard')) {
          unlinkSync(gitHookPath);
          console.log(chalk.green('✅ Whisper Guard uninstalled successfully!'));
        } else {
          console.log(chalk.yellow('⚠️  Pre-commit hook exists but is not a Whisper Guard'));
          console.log(chalk.gray('Manual removal may be required'));
        }
      } else {
        console.log(chalk.blue('ℹ️  No Whisper Guard hook found'));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Failed to uninstall guard: ${error.message}`));
    }
  }

  async doctor() {
    console.log(chalk.blue('🩺 Running system diagnostics...'));
    console.log('');
    
    const checks = [
      { name: 'Node.js Version', value: process.version, status: 'info' },
      { name: 'Platform', value: process.platform, status: 'info' },
      { name: 'User Config Path', value: this.config.configPath, status: 'info' }
    ];
    
    // Check authentication
    const isAuthenticated = await this.auth.check();
    checks.push({
      name: 'Authentication',
      value: isAuthenticated ? 'Authenticated' : 'Not authenticated',
      status: isAuthenticated ? 'success' : 'warning'
    });
    
    // Check git repository
    try {
      const { execSync } = await import('child_process');
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
      checks.push({ name: 'Git Repository', value: 'Found', status: 'success' });
      
      // Check for Whisper Guard
      const fs = await import('fs');
      const guardPath = '.git/hooks/pre-commit';
      if (fs.existsSync(guardPath)) {
        const content = fs.readFileSync(guardPath, 'utf8');
        if (content.includes('Whisper Security Guard')) {
          checks.push({ name: 'Whisper Guard', value: 'Installed', status: 'success' });
        } else {
          checks.push({ name: 'Whisper Guard', value: 'Other pre-commit hook found', status: 'warning' });
        }
      } else {
        checks.push({ name: 'Whisper Guard', value: 'Not installed', status: 'info' });
      }
    } catch (error) {
      checks.push({ name: 'Git Repository', value: 'Not found', status: 'info' });
    }
    
    // Check backend connectivity
    try {
      const token = await this.auth.getToken();
      if (token) {
        const response = await axios.get(`${BASE_URL}/health`);
        checks.push({ name: 'Backend Connection', value: 'Connected', status: 'success' });
      } else {
        checks.push({ name: 'Backend Connection', value: 'No token', status: 'warning' });
      }
    } catch (error) {
      checks.push({ name: 'Backend Connection', value: 'Failed', status: 'error' });
    }
    
    for (const check of checks) {
      const icon = {
        success: '✅',
        warning: '⚠️ ',
        error: '❌',
        info: 'ℹ️ '
      }[check.status] || 'ℹ️ ';
      
      const color = {
        success: chalk.green,
        warning: chalk.yellow,
        error: chalk.red,
        info: chalk.blue
      }[check.status] || chalk.blue;
      
      console.log(color(`${icon} ${check.name}: ${check.value}`));
    }
    
    console.log('');
    console.log(chalk.cyan('💡 For help and documentation: https://whisper-cli.dev'));
  }
}
