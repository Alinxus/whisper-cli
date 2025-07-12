import { createSpinner } from 'nanospinner';
import { readFileSync, writeFileSync, statSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { createInterface } from 'readline';
import chalk from 'chalk';
import boxen from 'boxen';
import gradient from 'gradient-string';
import figlet from 'figlet';
import inquirer from 'inquirer';
import { glob } from 'glob';
import fs from 'fs';
import path from 'path';

export class AIChat {
  constructor(aiEngine) {
    this.ai = aiEngine;
    this.conversationHistory = [];
    this.currentContext = {
      lastFile: null,
      lastSearch: null,
      currentTask: null,
      codebaseContext: null
    };
    this.capabilities = [
      'Read and analyze files',
      'Edit code with permission',
      'Search codebase',
      'Fix security issues',
      'Explain complex code',
      'Suggest improvements',
      'Answer questions about your code'
    ];
  }

  async start(options = {}) {
    // Clear screen and show modern welcome
    console.clear();
    this.showWelcome();
    
    // Load codebase context
    await this.loadCodebaseContext();
    
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('❯ '),
      completer: this.getAutoComplete.bind(this)
    });

    const ask = () => {
      process.stdout.write('\n');
      process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');
      rl.question(chalk.cyan('❯ ') + chalk.white('Ask me anything about your code: '), async (input) => {
        if (this.shouldExit(input)) {
          this.showGoodbye();
          rl.close();
          return;
        }

        if (input.trim()) {
          await this.processInput(input, rl);
        }
        ask();
      });
    };
    
    ask();
  }

  showWelcome() {
    const title = figlet.textSync('Whisper AI', { 
      font: 'Small',
      horizontalLayout: 'fitted'
    });
    
    console.log(gradient.pastel.multiline(title));
    
    console.log(boxen(
      chalk.cyan.bold('✨ AI-Powered Code Assistant') + '\n\n' +
      chalk.white('I can help you with:') + '\n' +
      this.capabilities.map(cap => chalk.gray('• ') + chalk.white(cap)).join('\n') + '\n\n' +
      chalk.yellow('💡 Try: "Analyze this file" or "Fix security issues"') + '\n' +
      chalk.gray('Type "exit", "quit", or "bye" to leave'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        backgroundColor: '#001122'
      }
    ));
  }

  showGoodbye() {
    console.log('\n');
    console.log(boxen(
      chalk.green('✓ Thanks for using Whisper AI!') + '\n' +
      chalk.gray('Your conversation history has been saved.') + '\n' +
      chalk.cyan('Come back anytime for more code assistance!'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    ));
  }

  shouldExit(input) {
    const exitCommands = ['exit', 'quit', 'bye', 'goodbye', 'q'];
    return exitCommands.includes(input.trim().toLowerCase());
  }

  async loadCodebaseContext() {
    const loadingSpinner = createSpinner('📂 Loading codebase context...').start();
    
    try {
      const analysis = await this.ai.analyzeCodebase(process.cwd());
      this.currentContext.codebaseContext = analysis;
      loadingSpinner.success({ text: `📁 Analyzed ${analysis.structure.totalFiles} files` });
    } catch (error) {
      loadingSpinner.warn({ text: 'Codebase analysis limited - continuing anyway' });
    }
  }

  getAutoComplete(line) {
    const completions = [
      'analyze this file',
      'fix security issues', 
      'explain this code',
      'read file ',
      'search for ',
      'help me with',
      'what does this do?',
      'how can I improve',
      'find vulnerabilities'
    ];
    
    const hits = completions.filter(c => c.startsWith(line));
    return [hits.length ? hits : completions, line];
  }

  async processInput(input, rl) {
    const thinkingMessages = [
      '🤔 Analyzing your request...',
      '🧠 Processing with AI...',
      '⚡ Computing response...',
      '🔍 Understanding context...',
      '💭 Thinking deeply...'
    ];
    
    const randomMessage = thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];
    const spinner = createSpinner(randomMessage).start();
    
    try {
      // Show user input in a nice format
      this.displayUserMessage(input);
      
      const intent = this.parseIntent(input);
      let response = '';
      let needsConfirmation = false;

      switch (intent.action) {
        case 'read':
          response = await this.handleReadFile(intent.file);
          this.currentContext.lastFile = intent.file;
          break;
        case 'search':
          response = await this.handleSearch(intent.query);
          this.currentContext.lastSearch = intent.query;
          break;
        case 'edit':
          needsConfirmation = true;
          response = await this.handleEdit(intent.file, intent.op, intent.target, intent.newCode);
          this.currentContext.lastFile = intent.file;
          break;
        case 'fix_security':
          needsConfirmation = true;
          response = await this.handleSecurityFix();
          break;
        case 'summarize':
          response = await this.handleSummarize(intent.file);
          this.currentContext.lastFile = intent.file;
          break;
        case 'scan':
          response = await this.handleCodebaseScan();
          break;
        case 'ai':
        default:
          const contextualPrompt = this.buildAdvancedPrompt(input);
          response = await this.ai.queryLLM(contextualPrompt);
          break;
      }

      // Store conversation
      this.conversationHistory.push({
        user: input,
        ai: response,
        timestamp: new Date().toISOString(),
        context: { ...this.currentContext },
        needsConfirmation
      });

      spinner.success({ text: '✨ Response ready!' });
      this.displayAIResponse(response, needsConfirmation);
      
    } catch (error) {
      spinner.error({ text: '❌ Something went wrong' });
      this.displayError(error.message);
    }
  }

  displayUserMessage(input) {
    console.log('\n' + boxen(
      chalk.blue('👤 You') + '\n\n' + chalk.white(input),
      {
        padding: 1,
        margin: { top: 1, bottom: 0, left: 2, right: 2 },
        borderStyle: 'round',
        borderColor: 'blue',
        backgroundColor: '#001a33'
      }
    ));
  }

  displayAIResponse(response, needsConfirmation = false) {
    const icon = needsConfirmation ? '⚠️  Assistant' : '🤖 Assistant';
    const color = needsConfirmation ? 'yellow' : 'green';
    
    console.log('\n' + boxen(
      chalk[color](icon) + '\n\n' + chalk.white(this.formatResponse(response)),
      {
        padding: 1,
        margin: { top: 1, bottom: 1, left: 2, right: 2 },
        borderStyle: 'round',
        borderColor: color,
        backgroundColor: needsConfirmation ? '#332200' : '#002200'
      }
    ));
  }

  displayError(message) {
    console.log('\n' + boxen(
      chalk.red('❌ Error') + '\n\n' + chalk.white(message) + '\n\n' +
      chalk.gray('Don\'t worry! Try rephrasing your request or ask for help.'),
      {
        padding: 1,
        margin: { top: 1, bottom: 1, left: 2, right: 2 },
        borderStyle: 'round',
        borderColor: 'red',
        backgroundColor: '#330000'
      }
    ));
  }

  formatResponse(response) {
    // Format response like a helpful assistant
    if (response.length > 500) {
      // Long responses get better formatting
      return response.split('\n').map(line => {
        if (line.startsWith('```')) return chalk.cyan(line);
        if (line.includes('Error:')) return chalk.red(line);
        if (line.includes('Warning:')) return chalk.yellow(line);
        if (line.includes('Success:')) return chalk.green(line);
        return line;
      }).join('\n');
    }
    return response;
  }

  parseIntent(input) {
    const lower = input.toLowerCase();
    if (lower.startsWith('read file')) {
      return { action: 'read', file: input.split('read file')[1].trim() };
    }
    if (lower.startsWith('search for')) {
      return { action: 'search', query: input.split('search for')[1].trim() };
    }
    if (lower.startsWith('edit file')) {
      const match = input.match(/edit file ([^ ]+) (insert|replace|delete) (.+?)(?: with (.+))?$/i);
      if (match) {
        return {
          action: 'edit',
          file: match[1],
          op: match[2],
          target: match[3],
          newCode: match[4]
        };
      }
      return { action: 'edit', file: input.split('edit file')[1].trim() };
    }
    if (lower.startsWith('fix security')) {
      return { action: 'fix_security' };
    }
    if (lower.startsWith('summarize')) {
      return { action: 'summarize', file: input.split('summarize')[1].trim() };
    }
    return { action: 'ai', input };
  }

  readFile(filePath) {
    try {
      const absPath = resolve(process.cwd(), filePath);
      return readFileSync(absPath, 'utf8');
    } catch (e) {
      return `Error reading file: ${e.message}`;
    }
  }

  searchCodebase(query) {
    const results = [];
    const walk = (dir) => {
      try {
        const files = readdirSync(dir);
        files.forEach(f => {
          const full = join(dir, f);
          try {
            const stats = statSync(full);
            if (stats.isDirectory()) {
              walk(full);
            } else if (full.endsWith('.js')) {
              const content = readFileSync(full, 'utf8');
              if (content.includes(query)) {
                results.push(full);
              }
            }
          } catch (e) {
            // Skip files we can't read
          }
        });
      } catch (e) {
        // Skip directories we can't read
      }
    };
    walk(join(process.cwd(), 'lib'));
    return 'Found in files:\n' + results.join('\n');
  }

  async editFile(filePath, op, target, newCode) {
    try {
      const absPath = resolve(process.cwd(), filePath);
      let content = readFileSync(absPath, 'utf8');
      let newContent = content;

      if (op === 'insert') {
        const idx = content.indexOf(target);
        if (idx !== -1) {
          newContent = content.slice(0, idx + target.length) + '\n' + newCode + '\n' + content.slice(idx + target.length);
        } else {
          return `Target not found: ${target}`;
        }
      } else if (op === 'replace') {
        if (content.includes(target)) {
          newContent = content.replace(target, newCode);
        } else {
          return `Target not found: ${target}`;
        }
      } else if (op === 'delete') {
        if (content.includes(target)) {
          newContent = content.replace(target, '');
        } else {
          return `Target not found: ${target}`;
        }
      } else {
        const prompt = `You are an expert code editor. The user wants to edit the following file (${filePath}) with this instruction: ${op} ${target} ${newCode || ''}. Here is the file content:\n\n${content}\n\nReturn ONLY the new file content.`;
        newContent = await this.ai.queryLLM(prompt);
      }

      writeFileSync(absPath, newContent, 'utf8');
      return 'Edit applied.';
    } catch (e) {
      return `Error editing file: ${e.message}`;
    }
  }

  async fixSecurity() {
    const { WhisperCLI } = await import('../index.js');
    const whisper = new WhisperCLI();
    await whisper.fixSecurityIssues();
    return 'Security auto-fix completed!';
  }

  async summarizeFile(filePath) {
    const content = this.readFile(filePath);
    const prompt = `Summarize the following code and explain its purpose:\n\n${content}`;
    return await this.ai.queryLLM(prompt);
  }

  buildContextualPrompt(userInput) {
    const recentHistory = this.conversationHistory.slice(-3); // Last 3 exchanges
    const contextInfo = [];
    
    if (this.currentContext.lastFile) {
      contextInfo.push(`Last file discussed: ${this.currentContext.lastFile}`);
    }
    if (this.currentContext.lastSearch) {
      contextInfo.push(`Last search: ${this.currentContext.lastSearch}`);
    }
    if (this.currentContext.currentTask) {
      contextInfo.push(`Current task: ${this.currentContext.currentTask}`);
    }

    let prompt = `You are an AI assistant helping with a codebase. `;
    
    if (contextInfo.length > 0) {
      prompt += `\n\nContext:\n${contextInfo.join('\n')}`;
    }
    
    if (recentHistory.length > 0) {
      prompt += `\n\nRecent conversation:\n`;
      recentHistory.forEach(exchange => {
        prompt += `User: ${exchange.user}\nAI: ${exchange.ai}\n`;
      });
    }
    
    prompt += `\n\nCurrent user input: ${userInput}`;
    return prompt;
  }
} 