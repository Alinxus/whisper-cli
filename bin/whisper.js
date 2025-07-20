#!/usr/bin/env node

import { Command } from 'commander';
import terminalKit from 'terminal-kit';
import boxen from 'boxen';
import ora from 'ora';
import Table from 'cli-table3';
import gradient from 'gradient-string';
import figlet from 'figlet';
import chalk from 'chalk';
import updateNotifier from 'update-notifier';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Import Whisper CLI modules
import { WhisperCLI } from '../lib/index.js';
// Remove AuthManager, Analytics, and backend-dependent imports
// import { AuthManager } from '../lib/auth/auth.js';
// import { Analytics } from '../lib/analytics/analytics.js';
import { ConfigManager } from '../lib/config/config.js';

// Load environment variables from .env if present
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

// Check for updates
updateNotifier({ pkg: packageJson }).notify();

const program = new Command();

// ASCII Art Banner
const banner = figlet.textSync('WHISPER', {
  font: 'ANSI Shadow',
  horizontalLayout: 'default',
  verticalLayout: 'default',
  width: 80,
  whitespaceBreak: true
});

console.log(gradient.pastel.multiline(banner));
console.log(chalk.cyan.bold('  AI-Powered Code Security Intelligence CLI\n'));

program
  .name('whisper')
  .description('AI-powered code security intelligence CLI for developers, teams, and security analysts')
  .version(packageJson.version, '-v, --version')
  .option('-d, --debug', 'Enable debug mode', false)
  .option('--no-color', 'Disable colored output', false)
  .hook('preAction', async (thisCommand) => {
    const options = thisCommand.opts();
    
    const loading = ora({
       text: 'Initializing Whisper CLI...'
    }).start();

    await new Promise(resolve => setTimeout(resolve, 1000));  // Simulate loading
    loading.succeed('Ready to roll!');
    console.log('🌐 Whisper CLI ready (standalone mode)');
    
    // Initialize Whisper CLI (no auth)
    const whisper = new WhisperCLI(options);
    await whisper.initialize();
    
    // Set global whisper instance
    global.whisper = whisper;
  });

// Global error handler
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled rejection:'), error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught exception:'), error);
  process.exit(1);
});

// Scan command
program
  .command('scan')
  .description('🔒 Scan code for vulnerabilities and improvements')
  .argument('[path]', 'Path to scan (default: current directory)', '.')
  .option('-a, --ai', 'Enable AI-powered analysis', true)
  .option('-f, --format <format>', 'Output format (markdown, html, json, csv)', 'markdown')
  .option('-o, --output <file>', 'Output file path')
  .option('--fix', 'Attempt to auto-fix issues', false)
  .option('--ignore <patterns>', 'Ignore patterns (comma-separated)')
  .option('--include <patterns>', 'Include patterns (comma-separated)')
  .option('--max-files <number>', 'Maximum files to scan', '1000')
  .option('--max-tokens <number>', 'Maximum tokens per AI request', '4000')
  .option('--model <model>', 'AI model to use (gemini, openai, claude)', 'gemini')
  .option('--severity <level>', 'Minimum severity level (low, medium, high, critical)', 'low')
  .option('--no-progress', 'Disable progress indicators', false)
  .option('--quiet', 'Suppress all output except errors', false)
  .action(async (path, options) => {
    try {
      const whisper = global.whisper;
      await whisper.scan(path, options);
    } catch (error) {
      console.error(chalk.red('Scan failed:'), error.message);
      process.exit(1);
    }
  });

// Team commands
program
  .command('team')
  .description('Team and organization management')
  .addCommand(
    new Command('sync')
      .description('Sync with team dashboard')
      .option('--project <name>', 'Project name')
      .option('--org <name>', 'Organization name')
      .action(async (options) => {
        try {
          const whisper = global.whisper;
          await whisper.teamSync(options);
        } catch (error) {
          console.error(chalk.red('Team sync failed:'), error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('invite')
      .description('Invite team member')
      .argument('<email>', 'Email address to invite')
      .option('--role <role>', 'Team role (admin, member, viewer)', 'member')
      .action(async (email, options) => {
        try {
          const whisper = global.whisper;
          await whisper.teamInvite(email, options);
        } catch (error) {
          console.error(chalk.red('Invite failed:'), error.message);
          process.exit(1);
        }
      })
  );

// Plugin commands
program
  .command('plugin')
  .description('Plugin management')
  .addCommand(
    new Command('install')
      .description('Install a plugin')
      .argument('<plugin>', 'Plugin name or URL')
      .action(async (plugin) => {
        try {
          const whisper = global.whisper;
          await whisper.pluginInstall(plugin);
        } catch (error) {
          console.error(chalk.red('Plugin installation failed:'), error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List installed plugins')
      .action(async () => {
        try {
          const whisper = global.whisper;
          await whisper.pluginList();
        } catch (error) {
          console.error(chalk.red('Plugin list failed:'), error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('remove')
      .description('Remove a plugin')
      .argument('<plugin>', 'Plugin name')
      .action(async (plugin) => {
        try {
          const whisper = global.whisper;
          await whisper.pluginRemove(plugin);
        } catch (error) {
          console.error(chalk.red('Plugin removal failed:'), error.message);
          process.exit(1);
        }
      })
  );

// History command
program
  .command('history')
  .description('View chat and scan history')
  .option('--chat', 'Show chat history')
  .option('--scans', 'Show scan history')
  .option('--clear', 'Clear history')
  .action(async (options) => {
    try {
      const whisper = global.whisper;
      await whisper.showHistory(options);
    } catch (error) {
      console.error(chalk.red('History failed:'), error.message);
      process.exit(1);
    }
  });

// Config commands
program
  .command('config')
  .description('Configuration management')
  .addCommand(
    new Command('get')
      .description('Get configuration value')
      .argument('<key>', 'Configuration key')
      .action(async (key) => {
        try {
          const config = new ConfigManager();
          const value = await config.get(key);
          console.log(value);
        } catch (error) {
          console.error(chalk.red('Config get failed:'), error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('set')
      .description('Set configuration value')
      .argument('<key>', 'Configuration key')
      .argument('<value>', 'Configuration value')
      .action(async (key, value) => {
        try {
          const config = new ConfigManager();
          await config.set(key, value);
        } catch (error) {
          console.error(chalk.red('Config set failed:'), error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List all configuration')
      .action(async () => {
        try {
          const config = new ConfigManager();
          await config.list();
        } catch (error) {
          console.error(chalk.red('Config list failed:'), error.message);
          process.exit(1);
        }
      })
  );

// Explain command
program
  .command('explain')
  .description('🧠 Explain code securely with AI analysis')
  .argument('<file>', 'File path to explain')
  .option('-l, --line <line>', 'Specific line number to explain')
  .option('-f, --function <function>', 'Function name to explain')
  .option('--security', 'Focus on security aspects', false)
  .option('--model <model>', 'AI model to use', 'gemini')
  .action(async (file, options) => {
    try {
      const whisper = global.whisper;
      await whisper.explainCode(file, options);
    } catch (error) {
      console.error(chalk.red('Explain failed:'), error.message);
      process.exit(1);
    }
  });

// Fix command
program
  .command('fix')
  .description('🔧 Get AI-powered fix suggestions (non-destructive)')
  .argument('[path]', 'Path to analyze for fixes (default: current directory)', '.')
  .option('--interactive', 'Interactive mode for applying fixes', false)
  .option('--severity <level>', 'Minimum severity level (low, medium, high, critical)', 'medium')
  .option('--model <model>', 'AI model to use', 'gemini')
  .action(async (path, options) => {
    try {
      const whisper = global.whisper;
      await whisper.suggestFixes(path, options);
    } catch (error) {
      console.error(chalk.red('Fix suggestions failed:'), error.message);
      process.exit(1);
    }
  });

// Guard command
program
  .command('guard')
  .description('🛡️ Git pre-commit security guard')
  .option('--install', 'Install pre-commit hook', false)
  .option('--uninstall', 'Uninstall pre-commit hook', false)
  .option('--severity <level>', 'Block commits with issues above this level', 'medium')
  .action(async (options) => {
    try {
      const whisper = global.whisper;
      await whisper.guard(options);
    } catch (error) {
      console.error(chalk.red('Guard failed:'), error.message);
      process.exit(1);
    }
  });

// Chat mode (AI terminal agent)
program
  .command('chat')
  .description('Interactive AI chat mode')
  .option('--model <model>', 'AI model to use', 'gemini')
  .option('--context <context>', 'Context file or directory')
  .action(async (options) => {
    try {
      const whisper = global.whisper;
      await whisper.chat(options);
    } catch (error) {
      console.error(chalk.red('Chat failed:'), error.message);
      process.exit(1);
    }
  });

// Update command
program
  .command('update')
  .description('Update Whisper CLI')
  .option('--force', 'Force update even if already latest', false)
  .action(async (options) => {
    try {
      const whisper = global.whisper;
      await whisper.update(options);
    } catch (error) {
      console.error(chalk.red('Update failed:'), error.message);
      process.exit(1);
    }
  });

// Doctor command
program
  .command('doctor')
  .description('Diagnose and fix common issues')
  .action(async () => {
    try {
      const whisper = global.whisper;
      await whisper.doctor();
    } catch (error) {
      console.error(chalk.red('Doctor failed:'), error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(); 