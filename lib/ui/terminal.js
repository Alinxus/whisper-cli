import chalk from 'chalk';
import { createSpinner } from 'nanospinner';
import boxen from 'boxen';
import gradient from 'gradient-string';
import figlet from 'figlet';
import { table } from 'table';

export class TerminalUI {
  constructor(options = {}) {
    this.options = {
      color: options.color !== false,
      quiet: options.quiet || false,
      debug: options.debug || false,
      ...options
    };
  }

  // Professional banner
  showBanner() {
    if (this.options.quiet) return;
    
    const banner = figlet.textSync('WHISPER', {
      font: 'ANSI Shadow',
      horizontalLayout: 'default',
      verticalLayout: 'default',
      width: 80,
      whitespaceBreak: true
    });

    console.log(gradient.pastel.multiline(banner));
    console.log(chalk.cyan.bold('  Secure Your Apps/Software\n'));
    console.log(chalk.gray('  AI-Powered Security Intelligence CLI\n'));
  }

  // Professional section headers
  section(title, subtitle = '') {
    if (this.options.quiet) return;
    
    console.log('\n' + chalk.blue.bold('═'.repeat(60)));
    console.log(chalk.blue.bold(`  ${title}`));
    if (subtitle) {
      console.log(chalk.gray(`  ${subtitle}`));
    }
    console.log(chalk.blue.bold('═'.repeat(60)));
  }

  // Progress with detailed information
  progress(message, details = '') {
    if (this.options.quiet) return createSpinner('').start();
    
    const spinner = createSpinner(chalk.cyan(message)).start();
    if (details) {
      console.log(chalk.gray(`  ${details}`));
    }
    return spinner;
  }

  // Success message with context
  success(message, context = '') {
    if (this.options.quiet) return;
    
    console.log(chalk.green('✅ ' + message));
    if (context) {
      console.log(chalk.gray(`  ${context}`));
    }
  }

  // Warning with details
  warning(message, details = '') {
    if (this.options.quiet) return;
    
    console.log(chalk.yellow('⚠️  ' + message));
    if (details) {
      console.log(chalk.gray(`  ${details}`));
    }
  }

  // Error with stack trace in debug mode
  error(message, error = null) {
    if (this.options.quiet) return;
    
    console.log(chalk.red('❌ ' + message));
    if (error && this.options.debug) {
      console.log(chalk.red(error.stack || error.message));
    }
  }

  // Info with context
  info(message, context = '') {
    if (this.options.quiet) return;
    
    console.log(chalk.blue('ℹ️  ' + message));
    if (context) {
      console.log(chalk.gray(`  ${context}`));
    }
  }

  // Security issue display
  securityIssue(issue, file = '') {
    if (this.options.quiet) return;
    
    const severityColors = {
      critical: chalk.red,
      high: chalk.magenta,
      medium: chalk.yellow,
      low: chalk.blue
    };

    const color = severityColors[issue.severity] || chalk.white;
    const severityIcon = {
      critical: '🚨',
      high: '🔴',
      medium: '🟡',
      low: '🔵'
    }[issue.severity] || '⚪';

    console.log(`\n${severityIcon} ${color.bold(issue.type.toUpperCase())} - ${issue.severity.toUpperCase()}`);
    console.log(chalk.white(`   ${issue.message}`));
    if (file) {
      console.log(chalk.gray(`   File: ${file}`));
    }
    if (issue.line) {
      console.log(chalk.gray(`   Line: ${issue.line}`));
    }
    if (issue.suggestion) {
      console.log(chalk.green(`   💡 Suggestion: ${issue.suggestion}`));
    }
  }

  // File processing status
  fileStatus(file, status, details = '') {
    if (this.options.quiet) return;
    
    const statusIcons = {
      scanning: '🔍',
      analyzing: '🧠',
      completed: '✅',
      error: '❌',
      skipped: '⏭️'
    };

    const statusColors = {
      scanning: chalk.blue,
      analyzing: chalk.magenta,
      completed: chalk.green,
      error: chalk.red,
      skipped: chalk.gray
    };

    const icon = statusIcons[status] || '⚪';
    const color = statusColors[status] || chalk.white;
    
    console.log(`${icon} ${color(file)} - ${status}`);
    if (details) {
      console.log(chalk.gray(`  ${details}`));
    }
  }

  // Summary table
  summary(data) {
    if (this.options.quiet) return;
    
    const tableData = [
      ['Metric', 'Count', 'Details'],
      ['Files Scanned', data.filesScanned || 0, 'Total files processed'],
      ['Issues Found', data.issuesFound || 0, 'Security issues detected'],
      ['Critical', data.critical || 0, 'Immediate attention required'],
      ['High', data.high || 0, 'High priority fixes needed'],
      ['Medium', data.medium || 0, 'Should be addressed soon'],
      ['Low', data.low || 0, 'Consider for improvement'],
      ['Scan Time', data.scanTime || 'N/A', 'Total processing time']
    ];

    console.log('\n' + boxen(table(tableData), {
      title: '📊 Scan Summary',
      titleAlignment: 'center',
      borderStyle: 'round',
      padding: 1
    }));
  }

  // AI thinking process
  aiThinking(step, details = '') {
    if (this.options.quiet) return;
    
    console.log(chalk.magenta(`🧠 AI: ${step}`));
    if (details) {
      console.log(chalk.gray(`   ${details}`));
    }
  }

  // Permission request
  async requestPermission(action, details) {
    if (this.options.quiet) return true;
    
    console.log(chalk.yellow.bold('\n🔐 Permission Required'));
    console.log(chalk.white(`Action: ${action}`));
    console.log(chalk.gray(`Details: ${details}`));
    
    // For now, return true (auto-approve)
    // In the future, this will integrate with proper permission system
    console.log(chalk.green('✅ Auto-approved (development mode)'));
    return true;
  }

  // Model selection display
  showModelInfo(model, provider, capabilities = []) {
    if (this.options.quiet) return;
    
    console.log(chalk.blue.bold('\n🤖 AI Model Information'));
    console.log(chalk.white(`Model: ${model}`));
    console.log(chalk.gray(`Provider: ${provider}`));
    if (capabilities.length > 0) {
      console.log(chalk.gray(`Capabilities: ${capabilities.join(', ')}`));
    }
  }

  // Large codebase progress
  largeCodebaseProgress(current, total, currentFile = '') {
    if (this.options.quiet) return;
    
    const percentage = Math.round((current / total) * 100);
    const progressBar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
    
    console.log(`\r${chalk.blue('📁')} Progress: [${progressBar}] ${percentage}% (${current}/${total})`);
    if (currentFile) {
      console.log(chalk.gray(`   Currently scanning: ${currentFile}`));
    }
  }
} 