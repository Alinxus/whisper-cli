import { createSpinner } from 'nanospinner';
import { readFileSync, writeFileSync, statSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { createInterface } from 'readline';

export class AIChat {
  constructor(aiEngine) {
    this.ai = aiEngine;
    this.conversationHistory = [];
    this.currentContext = {
      lastFile: null,
      lastSearch: null,
      currentTask: null
    };
  }

  async start(options = {}) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('💬 AI Chat session started. Type your question and press Enter. Type "exit" to quit.');
    console.log('💡 I remember our conversation and can help with your codebase!');

    const ask = () => {
      rl.question('You: ', async (input) => {
        if (input.trim().toLowerCase() === 'exit') {
          rl.close();
          return;
        }

        await this.processInput(input, rl);
        ask();
      });
    };
    ask();
  }

  async processInput(input, rl) {
    const spinner = createSpinner('Processing...').start();
    
    try {
      const intent = this.parseIntent(input);
      let response = '';

      switch (intent.action) {
        case 'read':
          response = this.readFile(intent.file);
          this.currentContext.lastFile = intent.file;
          break;
        case 'search':
          response = this.searchCodebase(intent.query);
          this.currentContext.lastSearch = intent.query;
          break;
        case 'edit':
          response = await this.editFile(intent.file, intent.op, intent.target, intent.newCode);
          this.currentContext.lastFile = intent.file;
          break;
        case 'fix_security':
          response = await this.fixSecurity();
          break;
        case 'summarize':
          response = await this.summarizeFile(intent.file);
          this.currentContext.lastFile = intent.file;
          break;
        case 'ai':
        default:
          // Add conversation context to AI prompts
          const contextualPrompt = this.buildContextualPrompt(input);
          response = await this.ai.queryLLM(contextualPrompt);
          break;
      }

      // Store conversation history
      this.conversationHistory.push({
        user: input,
        ai: response,
        timestamp: new Date().toISOString(),
        context: { ...this.currentContext }
      });

      spinner.success({ text: 'Done!' });
      console.log('AI:', response);
    } catch (error) {
      spinner.error({ text: 'Error occurred' });
      console.log('AI: Error:', error.message);
    }
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