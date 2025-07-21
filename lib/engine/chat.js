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
      'Read and analyze any file in the codebase',
      'Grep/search through files and directories', 
      'Edit code with your permission',
      'Scan files for security vulnerabilities',
      'Fix security issues automatically',
      'Explain complex code and logic',
      'Suggest improvements and best practices',
      'Answer questions about your codebase',
      'Store and remember file context across sessions'
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
      chalk.yellow('💡 Try: "scan lib/index.js" or "grep function" or "analyze security"') + '\n' +
      chalk.gray('Commands: scan [file], grep [pattern], read [file], edit [file]') + '\n' +
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
      'scan ',
      'grep ',
      'read ',
      'edit ',
      'analyze ',
      'fix security issues',
      'explain this code',
      'search for ',
      'help me with',
      'what does this do?',
      'how can I improve',
      'find vulnerabilities',
      'list files',
      'show structure'
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
        case 'scan':
          response = await this.handleScanFile(intent.file);
          this.currentContext.lastFile = intent.file;
          break;
        case 'grep':
        case 'search':
          response = await this.handleGrepSearch(intent.query, intent.path);
          this.currentContext.lastSearch = intent.query;
          break;
        case 'edit':
          needsConfirmation = true;
          response = await this.handleEditFile(intent.file, intent.changes);
          this.currentContext.lastFile = intent.file;
          break;
        case 'fix_security':
          needsConfirmation = true;
          response = await this.handleSecurityFix(intent.file);
          break;
        case 'list_files':
          response = await this.handleListFiles(intent.path);
          break;
        case 'show_structure':
          response = await this.handleShowStructure();
          break;
        case 'analyze':
          response = await this.handleAnalyzeFile(intent.file);
          this.currentContext.lastFile = intent.file;
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

  buildAdvancedPrompt(input) {
    // Build context-aware prompt based on conversation history and codebase
    let prompt = `You are an expert AI assistant helping with code analysis and security.

User request: ${input}

`;

    // Add codebase context if available
    if (this.currentContext.codebaseContext) {
      prompt += `Codebase context:
- Total files: ${this.currentContext.codebaseContext.structure.totalFiles}
- Languages: ${Object.keys(this.currentContext.codebaseContext.structure.languages).join(', ')}

`;
    }

    // Add conversation history context
    if (this.conversationHistory.length > 0) {
      const recentHistory = this.conversationHistory.slice(-3);
      prompt += `Recent conversation:
${recentHistory.map(h => `User: ${h.user}\nAI: ${h.ai.substring(0, 200)}...`).join('\n\n')}

`;
    }

    // Add current context
    if (this.currentContext.lastFile) {
      prompt += `Last file discussed: ${this.currentContext.lastFile}
`;
    }
    if (this.currentContext.lastSearch) {
      prompt += `Last search: ${this.currentContext.lastSearch}
`;
    }

    prompt += `\nPlease provide a helpful, accurate, and concise response.`;
    return prompt;
  }

  parseIntent(input) {
    const lower = input.toLowerCase().trim();
    
    // Enhanced command parsing
    if (lower.startsWith('scan ')) {
      return { action: 'scan', file: input.substring(5).trim() };
    }
    if (lower.startsWith('read ')) {
      return { action: 'read', file: input.substring(5).trim() };
    }
    if (lower.startsWith('grep ')) {
      const parts = input.substring(5).trim().split(' in ');
      return { 
        action: 'grep', 
        query: parts[0].trim(), 
        path: parts[1] ? parts[1].trim() : '.' 
      };
    }
    if (lower.startsWith('search ')) {
      const parts = input.substring(7).trim().split(' in ');
      return { 
        action: 'search', 
        query: parts[0].trim(), 
        path: parts[1] ? parts[1].trim() : '.' 
      };
    }
    if (lower.startsWith('edit ')) {
      return { action: 'edit', file: input.substring(5).trim() };
    }
    if (lower.startsWith('analyze ')) {
      return { action: 'analyze', file: input.substring(8).trim() };
    }
    if (lower.startsWith('fix security')) {
      const file = input.substring(12).trim();
      return { action: 'fix_security', file: file || null };
    }
    if (lower === 'list files' || lower === 'ls') {
      return { action: 'list_files', path: '.' };
    }
    if (lower === 'show structure' || lower === 'structure') {
      return { action: 'show_structure' };
    }
    
    // Legacy support
    if (lower.startsWith('read file')) {
      return { action: 'read', file: input.split('read file')[1].trim() };
    }
    if (lower.startsWith('search for')) {
      return { action: 'search', query: input.split('search for')[1].trim() };
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

  async handleReadFile(filePath) {
    return this.readFile(filePath);
  }

  async handleSearch(query) {
    return this.searchCodebase(query);
  }

  async handleEdit(filePath, op, target, newCode) {
    return await this.editFile(filePath, op, target, newCode);
  }

  async handleSecurityFix() {
    return await this.fixSecurity();
  }

  async handleSummarize(filePath) {
    return await this.summarizeFile(filePath);
  }

  async handleCodebaseScan() {
    const { WhisperCLI } = await import('../index.js');
    const whisper = new WhisperCLI();
    await whisper.scan('.', { ai: true });
    return 'Codebase scan completed! Check the results above.';
  }

  // Enhanced file operation handlers
  async handleScanFile(filePath) {
    if (!filePath) {
      return 'Please specify a file to scan. Example: scan lib/index.js';
    }
    
    try {
      const content = this.readFile(filePath);
      if (content.startsWith('Error reading file:')) {
        return content;
      }
      
      // Use AI to perform comprehensive analysis
      const analysis = await this.ai.analyzeFile(filePath, content, {
        context: 'security_and_quality',
        maxTokens: 4000
      });
      
      if (analysis.insights && analysis.insights.length > 0) {
        let result = `\n📋 **Analysis Results for ${filePath}**\n\n`;
        analysis.insights.forEach((insight, i) => {
          result += `### Analysis ${i + 1}:\n${insight}\n\n`;
        });
        return result;
      } else {
        return `File scanned successfully. No specific issues found in ${filePath}.`;
      }
    } catch (error) {
      return `Error scanning file: ${error.message}`;
    }
  }

  async handleGrepSearch(query, searchPath = '.') {
    if (!query) {
      return 'Please specify a search pattern. Example: grep "function" or grep "import" in lib';
    }
    
    try {
      const results = [];
      const searchDir = resolve(process.cwd(), searchPath);
      
      const searchInDirectory = (dir) => {
        try {
          const files = readdirSync(dir);
          files.forEach(file => {
            const fullPath = join(dir, file);
            try {
              const stats = statSync(fullPath);
              if (stats.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                searchInDirectory(fullPath);
              } else if (this.isTextFile(file)) {
                const content = readFileSync(fullPath, 'utf8');
                const lines = content.split('\n');
                lines.forEach((line, lineNum) => {
                  if (line.toLowerCase().includes(query.toLowerCase())) {
                    results.push({
                      file: fullPath.replace(process.cwd(), '.'),
                      line: lineNum + 1,
                      content: line.trim()
                    });
                  }
                });
              }
            } catch (e) {
              // Skip files we can't read
            }
          });
        } catch (e) {
          // Skip directories we can't read
        }
      };
      
      searchInDirectory(searchDir);
      
      if (results.length === 0) {
        return `No matches found for "${query}" in ${searchPath}`;
      }
      
      let response = `\n🔍 **Found ${results.length} matches for "${query}":**\n\n`;
      results.slice(0, 20).forEach(result => {
        response += `📄 ${result.file}:${result.line}\n   ${chalk.gray(result.content)}\n\n`;
      });
      
      if (results.length > 20) {
        response += `... and ${results.length - 20} more matches.\n`;
      }
      
      return response;
    } catch (error) {
      return `Error during search: ${error.message}`;
    }
  }

  async handleEditFile(filePath, changes) {
    if (!filePath) {
      return 'Please specify a file to edit. Example: edit lib/index.js';
    }
    
    try {
      const content = this.readFile(filePath);
      if (content.startsWith('Error reading file:')) {
        return content;
      }
      
      // Use AI to suggest edits
      const prompt = `You are an expert code editor. The user wants to edit the file: ${filePath}

Current file content:
${content}

Please suggest specific improvements or fixes for this code. Focus on:
1. Security vulnerabilities
2. Code quality issues
3. Best practices
4. Performance optimizations

Provide your suggestions in this format:
**Suggested Changes:**
- Issue: [description]
  Fix: [specific code change]
- Issue: [description]
  Fix: [specific code change]`;
      
      const suggestions = await this.ai.queryLLM(prompt);
      
      return `\n📝 **Edit Suggestions for ${filePath}:**\n\n${suggestions}\n\n` +
             `💡 To apply changes, I'll need your confirmation. Would you like me to implement any of these suggestions?`;
    } catch (error) {
      return `Error analyzing file for edits: ${error.message}`;
    }
  }

  async handleAnalyzeFile(filePath) {
    if (!filePath) {
      return 'Please specify a file to analyze. Example: analyze lib/scanner/index.js';
    }
    
    return await this.handleScanFile(filePath); // Reuse scan functionality
  }

  async handleSecurityFix(filePath) {
    if (filePath) {
      // Fix specific file
      try {
        const content = this.readFile(filePath);
        if (content.startsWith('Error reading file:')) {
          return content;
        }
        
        const analysis = await this.ai.analyzeFile(filePath, content, {
          context: 'security_focused',
          maxTokens: 4000
        });
        
        if (analysis.insights && analysis.insights.length > 0) {
          return `\n⚠️  **Security Analysis for ${filePath}:**\n\n` +
                 analysis.insights.join('\n\n') +
                 '\n\n❓ Would you like me to apply security fixes to this file?';
        } else {
          return `✅ No obvious security issues found in ${filePath}.`;
        }
      } catch (error) {
        return `Error analyzing file security: ${error.message}`;
      }
    } else {
      // Fix entire codebase
      return await this.fixSecurity();
    }
  }

  async handleListFiles(searchPath = '.') {
    try {
      const targetPath = resolve(process.cwd(), searchPath);
      const files = readdirSync(targetPath, { withFileTypes: true });
      
      let response = `\n📁 **Files in ${searchPath}:**\n\n`;
      
      const directories = files.filter(f => f.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
      const regularFiles = files.filter(f => f.isFile()).sort((a, b) => a.name.localeCompare(b.name));
      
      directories.forEach(dir => {
        if (!dir.name.startsWith('.')) {
          response += `📂 ${dir.name}/\n`;
        }
      });
      
      regularFiles.forEach(file => {
        const ext = path.extname(file.name);
        const icon = this.getFileIcon(ext);
        response += `${icon} ${file.name}\n`;
      });
      
      return response;
    } catch (error) {
      return `Error listing files: ${error.message}`;
    }
  }

  async handleShowStructure() {
    if (!this.currentContext.codebaseContext) {
      return 'Codebase context not loaded. Please wait for initial analysis to complete.';
    }
    
    const ctx = this.currentContext.codebaseContext;
    let response = `\n🏗️  **Codebase Structure:**\n\n`;
    
    response += `📊 **Summary:**\n`;
    response += `   Total Files: ${ctx.structure.totalFiles}\n`;
    response += `   Languages: ${Object.keys(ctx.structure.languages).join(', ')}\n\n`;
    
    response += `📈 **File Types:**\n`;
    Object.entries(ctx.structure.languages).forEach(([ext, count]) => {
      response += `   ${ext || 'no extension'}: ${count} files\n`;
    });
    
    return response;
  }

  // Helper methods
  isTextFile(filename) {
    const textExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h', '.css', '.html', '.json', '.md', '.txt', '.yml', '.yaml', '.xml'];
    const ext = path.extname(filename).toLowerCase();
    return textExtensions.includes(ext);
  }

  getFileIcon(extension) {
    const icons = {
      '.js': '📄',
      '.ts': '📘',
      '.jsx': '⚛️ ',
      '.tsx': '⚛️ ',
      '.py': '🐍',
      '.java': '☕',
      '.go': '🐹',
      '.rs': '🦀',
      '.json': '📋',
      '.md': '📝',
      '.css': '🎨',
      '.html': '🌐',
      '.yml': '⚙️ ',
      '.yaml': '⚙️ '
    };
    return icons[extension.toLowerCase()] || '📄';
  }
}
