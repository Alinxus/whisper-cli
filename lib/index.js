// Main entry for Whisper CLI core logic
import { ConfigManager } from './config/config.js';
import { AIEngine } from './engine/ai.js';
import { Scanner } from './scanner/index.js';
import { Reporter } from './reporter/index.js';
import { PluginManager } from './plugins/index.js';
import {createSpinner} from 'nanospinner'
import chalk from 'chalk';
import axios from 'axios';

export class WhisperCLI {
  constructor(options = {}) {
    this.options = options;
    this.config = new ConfigManager();
    this.plugins = new PluginManager();
  }

  async initialize() {
    await this.config.load();
    await this.plugins.load();
}

  async scan(path, options) {
    const scanner = new Scanner();
    const ai = new AIEngine();
    const reporter = new Reporter();
    const rootPath = path || process.cwd();
    const scanOptions = options || {};

    console.clear();
    console.log('\n' + '═'.repeat(60));
    console.log('  🛡️  W H I S P E R   S E C U R I T Y   S C A N');
    console.log('═'.repeat(60));
    const indexSpinner = createSpinner('🔍 Indexing files...').start();
    try {
      const files = await scanner.crawl(rootPath, scanOptions);
      const ignorePatterns = scanOptions.ignore ? scanOptions.ignore.split(',') : [];
      const includePatterns = scanOptions.include ? scanOptions.include.split(',') : [];
      const filteredFiles = scanner.filter(files, { ignore: ignorePatterns, include: includePatterns });
      indexSpinner.success({ text: `📁 Found ${filteredFiles.length} files to analyze` });
      const scanSpinner = createSpinner('🔎 Analyzing security patterns...').start();
      const results = [];
      let processedCount = 0;
      let aiErrorOccurred = false;
      let aiErrorMessage = '';
      let aiErrorCount = 0;
      
      for (const file of filteredFiles) {
        const fs = await import('fs');
        try {
          const stats = fs.statSync(file);
          if (!stats.isFile()) continue;
          const content = fs.readFileSync(file, 'utf8');
          const staticIssues = await scanner.applyRules(file, content, rootPath);
          let aiResult = {};
          if (scanOptions.ai !== false) {
            try {
              aiResult = await ai.analyzeFile(file, content, scanOptions);
            } catch (e) {
              if (!aiErrorOccurred) {
                aiErrorOccurred = true;
                aiErrorMessage = e.message || 'AI analysis failed';
              }
              aiErrorCount++;
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
          scanSpinner.text = `🔎 Analyzing security patterns... ${processedCount}/${filteredFiles.length}`;
        } catch (e) {}
      }
      scanSpinner.success({ text: `✅ Security analysis complete` });
      if (aiErrorOccurred) {
        console.log(chalk.yellow(`⚠️  AI analysis encountered issues (${aiErrorCount}/${filteredFiles.length} files affected)`));
        console.log(chalk.gray(`   ${aiErrorMessage.includes('overloaded') ? 'Model overloaded - using fallback analysis' : 'Using static analysis only for affected files'}`));
      }
      // Always create a new markdown file for the full report
      const report = reporter.generateReport(results, { ...scanOptions, format: 'markdown' });
      const now = new Date();
      const pad = n => n.toString().padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const reportFile = `whisper-report-${timestamp}.md`;
      const fs = await import('fs');
      fs.writeFileSync(reportFile, report, 'utf8');
      
      // Save scan to history
      const scanId = `scan_${timestamp}`;
      await this.saveScanToHistory({
        id: scanId,
        timestamp: now.toISOString(),
        path: rootPath,
        results,
        reportFile,
        summary: {
          totalFiles: results.length,
          totalIssues: results.reduce((sum, r) => sum + r.issues.length, 0),
          criticalIssues: results.reduce((sum, r) => sum + r.issues.filter(i => ['secret', 'dangerous', 'critical'].includes(i.type)).length, 0),
          highIssues: results.reduce((sum, r) => sum + r.issues.filter(i => ['sql_injection', 'xss', 'weak_crypto', 'command_injection'].includes(i.type)).length, 0)
        },
        options: scanOptions
      });
      
      console.log(`\n📄 Full report saved to ${reportFile}`);
      console.log(`💾 Scan saved to history (ID: ${scanId})`);
      
      // Print only the summary in the terminal
      const { TerminalUI } = await import('./ui/terminal.js');
      const ui = new TerminalUI(this.options);
      ui.printSummaryReport(report);
      
      // Interactive post-scan options
      await this.showPostScanOptions(results, scanId, rootPath, scanOptions);
    } catch (error) {
      console.error(`\n❌ Scan failed: ${error.message}`);
    }
  }

  async explainCode(file, options) {
    console.log('📜 Analyzing and explaining the code...');
    const ai = new AIEngine();
    try {
      const fs = await import('fs');
      const content = fs.readFileSync(file, 'utf8');
      const prompt = options.line ?
        `Explain line ${options.line} in the following file:\n${file}:\n${content.split('\n')[options.line - 1]}` :
        `Explain the function ${options.function} in the file:\n${file}:\n---\n${content}`;
      const insights = await ai.queryDirectAPI(prompt, options.model || 'gemini-1.5-pro', options);
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
        } catch (e) { continue; }
        let content;
        try { content = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
        const staticIssues = await scanner.applyRules(file, content);
        const aiResult = await ai.analyzeFile(file, content, scanOptions);
        if ((staticIssues?.issues && staticIssues.issues.length > 0) || (aiResult?.insights && aiResult.insights.length > 0)) {
          filesWithIssues.push({ file, content, staticIssues, aiResult });
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
            const fixPrompt = `Suggest a fix for this issue:\nType: ${issue.type}\nMessage: ${issue.message}\nProvide a concise fix suggestion.`;
            try {
              const fixSuggestion = await ai.queryDirectAPI(fixPrompt, options.model || 'gemini-1.5-pro', options);
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
          const fixedCode = await ai.queryDirectAPI(fixPrompt, options.model || 'gemini-1.5-pro', options);
          
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

  async showHistory(options) {
    if (options.clear) {
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      const dataDir = path.join(os.homedir(), '.whisper');
      const historyFile = path.join(dataDir, 'scan-history.json');
      
      try {
        if (fs.existsSync(historyFile)) {
          fs.unlinkSync(historyFile);
        }
        console.log('🗑️ Scan history cleared.');
      } catch (error) {
        console.error('❌ Could not clear history:', error.message);
      }
      return;
    }

    if (options.chat) {
      console.log('📜 Chat History:');
      if (this.conversationHistory && this.conversationHistory.length > 0) {
        this.conversationHistory.forEach((entry, index) => {
          console.log(`\n${index + 1}. 🗨️  You: ${entry.user}\n🤖 AI: ${entry.ai}`);
        });
      } else {
        console.log('🔍 No chat history found.');
      }
    }

    if (options.scans) {
      const scans = await this.getScanHistory();
      
      if (scans.length === 0) {
        console.log('🔍 No scan history found.');
        console.log('💡 Run `whisper scan` to create your first scan.');
        return;
      }
      
      console.log('📈 Scan History:\n');
      console.log('┌' + '─'.repeat(80) + '┐');
      console.log('│' + chalk.bold(' SCAN HISTORY').padEnd(79) + '│');
      console.log('├' + '─'.repeat(80) + '┤');
      
      scans.forEach((scan, index) => {
        const date = new Date(scan.timestamp).toLocaleString();
        const status = scan.fixAttempted ? '✅ Fixed' : '🟡 Pending';
        const severity = scan.summary.criticalIssues > 0 ? '🔴 Critical' : 
                        scan.summary.highIssues > 0 ? '🟠 High' : 
                        scan.summary.totalIssues > 0 ? '🟡 Medium' : '🟢 Clean';
        
        console.log('│' + ' '.repeat(79) + '│');
        console.log('│' + chalk.bold(`${index + 1}. ${scan.id}`).padEnd(89) + '│');
        console.log('│' + `   Date: ${date}`.padEnd(79) + '│');
        console.log('│' + `   Path: ${scan.path}`.padEnd(79) + '│');
        console.log('│' + `   Files: ${scan.summary.totalFiles} | Issues: ${scan.summary.totalIssues} | Status: ${status}`.padEnd(89) + '│');
        console.log('│' + `   Severity: ${severity}`.padEnd(89) + '│');
        
        if (scan.fixAttempted) {
          const fixDate = new Date(scan.fixTimestamp).toLocaleString();
          console.log('│' + `   Fixed: ${scan.fixedFiles} files on ${fixDate}`.padEnd(89) + '│');
        }
        
        if (index < scans.length - 1) {
          console.log('├' + '─'.repeat(80) + '┤');
        }
      });
      
      console.log('└' + '─'.repeat(80) + '┘');
      
      console.log(`\n💡 Commands:`);
      console.log(`   🔧 Fix from history: whisper fix --history <scanId>`);
      console.log(`   📄 View report: cat whisper-report-*.md`);
      console.log(`   🗑️ Clear history: whisper history --clear`);
    }
    
    // If no specific option, show both
    if (!options.chat && !options.scans && !options.clear) {
      await this.showHistory({ scans: true });
    }
  }

  async getScanHistory() {
    // Simulate fetching scan history - replace with actual implementation
    return [
      { id: 'scan1', date: '2025-07-16', results: 'No major issues found.' },
      { id: 'scan2', date: '2025-07-15', results: 'Critical vulnerability detected.' }
    ];
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

  async showPostScanOptions(results, scanId, rootPath, options) {
    const { select } = await import('@inquirer/prompts');
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    
    if (totalIssues === 0) {
      console.log('\n✅ No security issues found! Your code is clean.');
      return;
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log(chalk.cyan('  🤖 Post-Scan Options'));
    console.log('═'.repeat(60));
    
    try {
      const choice = await select({
        message: 'What would you like to do next?',
        choices: [
          {
            name: `🔧 Fix Issues (AI-powered automatic fixes for ${totalIssues} issues)`,
            value: 'fix',
            description: 'Use AI to automatically fix security issues'
          },
          {
            name: '💾 Save & Exit (scan already saved to history)',
            value: 'save',
            description: 'Save the current scan and exit'
          },
          {
            name: '🚪 Exit',
            value: 'exit',
            description: 'Exit without additional actions'
          }
        ]
      });
      
      switch (choice) {
        case 'fix':
          await this.runAIFixer(results, scanId, options);
          break;
        case 'save':
          console.log(`💾 Scan ${scanId} has been saved to history.`);
          console.log('📊 Use `whisper history --scans` to view all saved scans.');
          console.log('🔧 Use `whisper fix --history ${scanId}` to apply fixes later.');
          break;
        case 'exit':
          console.log('👋 Thanks for using Whisper Security CLI!');
          break;
      }
    } catch (error) {
      console.error('Error in post-scan options:', error.message);
    }
  }
  
  async runAIFixer(results, scanId, options) {
    console.log('\n🤖 Starting AI-powered security fixing...');
    
    const filesWithIssues = results.filter(r => r.issues.length > 0);
    const { select, confirm } = await import('@inquirer/prompts');
    const ai = new AIEngine();
    const fs = await import('fs');
    
    // Show summary of what will be fixed
    console.log(`\n📊 Fix Summary:`);
    console.log(`Files with issues: ${filesWithIssues.length}`);
    console.log(`Total issues: ${results.reduce((sum, r) => sum + r.issues.length, 0)}`);
    
    // Ask for fixing mode
    const fixMode = await select({
      message: 'Choose fixing mode:',
      choices: [
        {
          name: '🤖 Automatic - Fix all issues automatically',
          value: 'automatic',
          description: 'Apply AI fixes to all files without prompting'
        },
        {
          name: '📋 Interactive - Review each file before fixing',
          value: 'interactive',
          description: 'Review and approve fixes for each file individually'
        },
        {
          name: '🔍 Preview - Show what would be fixed (dry-run)',
          value: 'preview',
          description: 'Preview all fixes without applying them'
        }
      ]
    });
    
    if (fixMode === 'preview') {
      return await this.previewFixes(filesWithIssues, ai, options);
    }
    
    const confirmed = await confirm({
      message: fixMode === 'automatic' ? 'Proceed with automatic fixes?' : 'Proceed with interactive fixes?',
      default: true
    });
    
    if (!confirmed) {
      console.log('❌ Fix operation cancelled.');
      return;
    }
    
    if (fixMode === 'interactive') {
      return await this.runInteractiveFixer(filesWithIssues, scanId, ai, options);
    }
    
    const fixSpinner = createSpinner('🔧 AI is analyzing and fixing issues...').start();
    let fixedFiles = 0;
    let failedFiles = 0;
    
    for (const result of filesWithIssues) {
      try {
        const content = fs.readFileSync(result.file, 'utf8');
        
        // Create backup
        const backupPath = `${result.file}.whisper-backup-${Date.now()}`;
        fs.writeFileSync(backupPath, content);
        
        // Generate comprehensive fix prompt
        const issuesList = result.issues.map(issue => 
          `- ${issue.type}: ${issue.message}${issue.line ? ` (Line ${issue.line})` : ''}`
        ).join('\n');
        
        const aiInsights = result.aiResult?.insights ? result.aiResult.insights.join('\n') : '';
        
        const fixPrompt = `You are an expert security engineer. Fix ALL security issues in this file while preserving functionality.

File: ${result.file}

Security Issues to Fix:
${issuesList}

AI Security Insights:
${aiInsights}

Original Code:
${content}

Provide the complete corrected code with ALL security issues fixed. Maintain the exact same functionality and structure. Return ONLY the fixed code without explanations or markdown formatting.`;
        
        fixSpinner.text = `🔧 Fixing ${result.file.split(/[\\/]/).pop()}...`;
        
        const fixedCode = await ai.queryDirectAPI(fixPrompt, options.model || 'gemini-2.0-flash-exp', {
          ...options,
          maxTokens: 8000,
          temperature: 0.1
        });
        
        if (fixedCode && fixedCode.trim()) {
          // Apply the fix
          fs.writeFileSync(result.file, fixedCode.trim());
          fixedFiles++;
        } else {
          console.warn(`⚠️  Could not generate fix for ${result.file}`);
          failedFiles++;
        }
        
      } catch (error) {
        console.error(`❌ Error fixing ${result.file}: ${error.message}`);
        failedFiles++;
      }
    }
    
    fixSpinner.success({ text: `🎉 AI fixing complete!` });
    
    console.log(`\n📊 Fix Results:`);
    console.log(`✅ Successfully fixed: ${fixedFiles} files`);
    if (failedFiles > 0) {
      console.log(`❌ Failed to fix: ${failedFiles} files`);
    }
    
    // Update scan history with fix results
    await this.updateScanHistory(scanId, {
      fixAttempted: true,
      fixedFiles,
      failedFiles,
      fixTimestamp: new Date().toISOString()
    });
    
    console.log(`\n💡 Backups saved with .whisper-backup-* extension`);
    console.log('🔍 Run another scan to verify the fixes: `whisper scan`');
  }
  
  async saveScanToHistory(scanData) {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    // Create whisper data directory in user's home
    const dataDir = path.join(os.homedir(), '.whisper');
    const historyFile = path.join(dataDir, 'scan-history.json');
    
    try {
      // Ensure directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Read existing history
      let history = [];
      if (fs.existsSync(historyFile)) {
        const content = fs.readFileSync(historyFile, 'utf8');
        history = JSON.parse(content);
      }
      
      // Add new scan
      history.unshift(scanData); // Add to beginning
      
      // Keep only last 50 scans
      if (history.length > 50) {
        history = history.slice(0, 50);
      }
      
      // Save updated history
      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
      
    } catch (error) {
      console.warn('⚠️  Could not save scan to history:', error.message);
    }
  }
  
  async updateScanHistory(scanId, updates) {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    const dataDir = path.join(os.homedir(), '.whisper');
    const historyFile = path.join(dataDir, 'scan-history.json');
    
    try {
      if (fs.existsSync(historyFile)) {
        const content = fs.readFileSync(historyFile, 'utf8');
        const history = JSON.parse(content);
        
        const scanIndex = history.findIndex(scan => scan.id === scanId);
        if (scanIndex !== -1) {
          history[scanIndex] = { ...history[scanIndex], ...updates };
          fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not update scan history:', error.message);
    }
  }
  
  async getScanHistory() {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    const dataDir = path.join(os.homedir(), '.whisper');
    const historyFile = path.join(dataDir, 'scan-history.json');
    
    try {
      if (fs.existsSync(historyFile)) {
        const content = fs.readFileSync(historyFile, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('⚠️  Could not read scan history:', error.message);
    }
    
    return [];
  }
  
  async fixFromHistory(scanId, options = {}) {
    console.log(`🔍 Looking for scan ${scanId} in history...`);
    
    const history = await this.getScanHistory();
    const scan = history.find(s => s.id === scanId);
    
    if (!scan) {
      console.error(`❌ Scan ${scanId} not found in history.`);
      console.log('📊 Use `whisper history --scans` to view available scans.');
      return;
    }
    
    console.log(`✅ Found scan from ${new Date(scan.timestamp).toLocaleString()}`);
    console.log(`📊 Issues: ${scan.summary.totalIssues} total, ${scan.summary.criticalIssues} critical`);
    
    if (scan.fixAttempted) {
      console.log(`⚠️  This scan was already fixed on ${new Date(scan.fixTimestamp).toLocaleString()}`);
      const { confirm } = await import('@inquirer/prompts');
      const proceed = await confirm({
        message: 'Do you want to attempt fixes again?',
        default: false
      });
      
      if (!proceed) {
        console.log('❌ Fix operation cancelled.');
        return;
      }
    }
    
    // Run the AI fixer with historical data
    await this.runAIFixer(scan.results, scanId, options);
  }

  async doctor() {
    console.log(chalk.blue('🩺 Running system diagnostics...'));
    console.log('');
    
    const checks = [
      { name: 'Node.js Version', value: process.version, status: 'info' },
      { name: 'Platform', value: process.platform, status: 'info' },
      { name: 'User Config Path', value: this.config.configPath, status: 'info' }
    ];
    
    // Check scan history
    const history = await this.getScanHistory();
    checks.push({ 
      name: 'Scan History', 
      value: `${history.length} saved scans`, 
      status: history.length > 0 ? 'success' : 'info' 
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
    
    // Check AI API keys
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    
    const availableAPIs = [];
    if (geminiKey) availableAPIs.push('Gemini');
    if (openaiKey) availableAPIs.push('OpenAI');
    if (anthropicKey) availableAPIs.push('Anthropic');
    
    checks.push({ 
      name: 'AI APIs', 
      value: availableAPIs.length > 0 ? availableAPIs.join(', ') : 'None configured', 
      status: availableAPIs.length > 0 ? 'success' : 'warning' 
    });
    
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

  // Interactive fixing methods
  async previewFixes(filesWithIssues, ai, options) {
    console.log('\n🔍 Previewing AI-generated fixes (dry-run mode)...');
    console.log('═'.repeat(60));
    
    for (let i = 0; i < filesWithIssues.length; i++) {
      const result = filesWithIssues[i];
      const fs = await import('fs');
      
      console.log(`\n📄 File ${i + 1}/${filesWithIssues.length}: ${chalk.cyan(result.file)}`);
      console.log('─'.repeat(50));
      
      // Show issues
      console.log(`🚨 Issues found (${result.issues.length}):`);
      result.issues.forEach((issue, idx) => {
        const severity = this.getIssueSeverityIcon(issue.type);
        console.log(`  ${severity} ${idx + 1}. ${issue.type}: ${issue.message}`);
        if (issue.line) console.log(`     Line ${issue.line}`);
      });
      
      try {
        const content = fs.readFileSync(result.file, 'utf8');
        const issuesList = result.issues.map(issue => 
          `- ${issue.type}: ${issue.message}${issue.line ? ` (Line ${issue.line})` : ''}`
        ).join('\n');
        
        const aiInsights = result.aiResult?.insights ? result.aiResult.insights.join('\n') : '';
        
        const previewPrompt = `You are a security expert. Analyze and suggest fixes for this file without actually providing the code.

File: ${result.file}

Issues:
${issuesList}

AI Insights:
${aiInsights}

Provide a brief summary of what fixes would be applied (max 200 words).`;
        
        const fixPreview = await ai.queryDirectAPI(previewPrompt, options.model || 'gemini-2.0-flash-exp', {
          ...options,
          maxTokens: 500,
          temperature: 0.1
        });
        
        console.log(`\n💡 Proposed fixes:`);
        console.log(chalk.gray(fixPreview));
        
      } catch (error) {
        console.log(`\n❌ Could not generate preview: ${error.message}`);
      }
      
      if (i < filesWithIssues.length - 1) {
        console.log('\n' + '─'.repeat(60));
      }
    }
    
    console.log('\n✅ Preview complete. No files were modified.');
    console.log('💡 To apply fixes, run the command again and choose "Automatic" or "Interactive" mode.');
  }
  
  async runInteractiveFixer(filesWithIssues, scanId, ai, options) {
    console.log('\n📋 Interactive fixing mode - reviewing each file...');
    const { select, confirm } = await import('@inquirer/prompts');
    const fs = await import('fs');
    
    let fixedFiles = 0;
    let skippedFiles = 0;
    let failedFiles = 0;
    
    for (let i = 0; i < filesWithIssues.length; i++) {
      const result = filesWithIssues[i];
      
      console.log('\n' + '═'.repeat(60));
      console.log(`📄 File ${i + 1}/${filesWithIssues.length}: ${chalk.cyan(result.file)}`);
      console.log('═'.repeat(60));
      
      // Show file issues
      console.log(`\n🚨 Issues found (${result.issues.length}):`);
      result.issues.forEach((issue, idx) => {
        const severity = this.getIssueSeverityIcon(issue.type);
        console.log(`  ${severity} ${idx + 1}. ${chalk.red(issue.type)}: ${issue.message}`);
        if (issue.line) console.log(`     ${chalk.gray('Line ' + issue.line)}`);
      });
      
      if (result.aiResult?.insights && result.aiResult.insights.length > 0) {
        console.log(`\n🧠 AI Insights:`);
        result.aiResult.insights.forEach(insight => {
          console.log(`  • ${chalk.yellow(insight)}`);
        });
      }
      
      // Ask user what to do with this file
      const action = await select({
        message: `What would you like to do with ${result.file.split(/[\\/]/).pop()}?`,
        choices: [
          {
            name: '🔧 Fix this file (generate and apply AI fix)',
            value: 'fix',
            description: 'Generate and apply AI-powered fixes'
          },
          {
            name: '👀 Preview fix (show what would be changed)',
            value: 'preview',
            description: 'Show the proposed fix without applying it'
          },
          {
            name: '⏭️  Skip this file (keep issues)',
            value: 'skip',
            description: 'Leave this file unchanged'
          },
          {
            name: '🚪 Exit interactive mode',
            value: 'exit',
            description: 'Stop the fixing process'
          }
        ]
      });
      
      if (action === 'exit') {
        console.log('\n👋 Exiting interactive fixing mode.');
        break;
      }
      
      if (action === 'skip') {
        console.log(`⏭️  Skipped ${result.file}`);
        skippedFiles++;
        continue;
      }
      
      try {
        const content = fs.readFileSync(result.file, 'utf8');
        const issuesList = result.issues.map(issue => 
          `- ${issue.type}: ${issue.message}${issue.line ? ` (Line ${issue.line})` : ''}`
        ).join('\n');
        
        const aiInsights = result.aiResult?.insights ? result.aiResult.insights.join('\n') : '';
        
        if (action === 'preview') {
          // Show a detailed preview with code snippets
          const previewPrompt = `You are an expert security engineer. Show me exactly what would be fixed in this file.

File: ${result.file}

Security Issues to Fix:
${issuesList}

AI Security Insights:
${aiInsights}

Original Code:
${content}

Provide a detailed explanation of what specific changes would be made, showing before/after code snippets for each fix. Be specific about line numbers and exact code changes.`;
          
          console.log('\n🔍 Generating detailed fix preview...');
          const detailedPreview = await ai.queryDirectAPI(previewPrompt, options.model || 'gemini-2.0-flash-exp', {
            ...options,
            maxTokens: 2000,
            temperature: 0.1
          });
          
          console.log('\n📋 Detailed Fix Preview:');
          console.log('─'.repeat(50));
          console.log(detailedPreview);
          console.log('─'.repeat(50));
          
          const shouldApply = await confirm({
            message: 'Do you want to apply these fixes now?',
            default: false
          });
          
          if (!shouldApply) {
            console.log(`⏭️  Skipped ${result.file}`);
            skippedFiles++;
            continue;
          }
        }
        
        // Generate and apply the fix
        const fixSpinner = createSpinner(`🔧 Generating fix for ${result.file.split(/[\\/]/).pop()}...`).start();
        
        const fixPrompt = `You are an expert security engineer. Fix ALL security issues in this file while preserving functionality.

File: ${result.file}

Security Issues to Fix:
${issuesList}

AI Security Insights:
${aiInsights}

Original Code:
${content}

Provide the complete corrected code with ALL security issues fixed. Maintain the exact same functionality and structure. Return ONLY the fixed code without explanations or markdown formatting.`;
        
        const fixedCode = await ai.queryDirectAPI(fixPrompt, options.model || 'gemini-2.0-flash-exp', {
          ...options,
          maxTokens: 8000,
          temperature: 0.1
        });
        
        if (fixedCode && fixedCode.trim()) {
          // Create backup
          const backupPath = `${result.file}.whisper-backup-${Date.now()}`;
          fs.writeFileSync(backupPath, content);
          
          // Apply the fix
          fs.writeFileSync(result.file, fixedCode.trim());
          fixSpinner.success({ text: `✅ Fixed ${result.file}` });
          console.log(`💾 Backup saved: ${backupPath}`);
          fixedFiles++;
        } else {
          fixSpinner.error({ text: `❌ Could not generate fix for ${result.file}` });
          failedFiles++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${result.file}: ${error.message}`);
        failedFiles++;
      }
    }
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log(chalk.cyan('📊 Interactive Fixing Summary'));
    console.log('═'.repeat(60));
    console.log(`✅ Files fixed: ${fixedFiles}`);
    console.log(`⏭️  Files skipped: ${skippedFiles}`);
    if (failedFiles > 0) {
      console.log(`❌ Files failed: ${failedFiles}`);
    }
    
    // Update scan history
    await this.updateScanHistory(scanId, {
      fixAttempted: true,
      fixedFiles,
      skippedFiles,
      failedFiles,
      fixTimestamp: new Date().toISOString(),
      fixMode: 'interactive'
    });
    
    if (fixedFiles > 0) {
      console.log('\n💡 Backups saved with .whisper-backup-* extension');
      console.log('🔍 Run another scan to verify the fixes: `whisper scan`');
    }
  }
  
  getIssueSeverityIcon(issueType) {
    const severityMap = {
      'secret': '🔴',
      'dangerous': '🔴', 
      'critical': '🔴',
      'sql_injection': '🟠',
      'xss': '🟠',
      'command_injection': '🟠',
      'weak_crypto': '🟡',
      'insecure_random': '🟡',
      'path_traversal': '🟡',
      'todo': '🔵',
      'debug': '🔵',
      'deprecated': '🔵'
    };
    return severityMap[issueType] || '🟡';
  }
}
