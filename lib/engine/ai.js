import { PromptEngine } from './prompt.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { createSpinner } from 'nanospinner';
import { glob } from 'glob';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import boxen from 'boxen';
import inquirer from 'inquirer';

export class AIEngine {
  constructor({ model = 'gemini', apiKeys = {} } = {}) {
    this.model = model;
    this.promptEngine = new PromptEngine();
    
    // Prefer environment variables for API keys
    this.apiKeys = {
      google: process.env.GEMINI_API_KEY || apiKeys.google,
      openai: process.env.OPENAI_API_KEY || apiKeys.openai,
      anthropic: process.env.ANTHROPIC_API_KEY || apiKeys.anthropic
    };

    // Initialize the appropriate client based on model
    if (model === 'gemini') {
      this.client = new GoogleGenerativeAI(this.apiKeys.google);
    } else if (model === 'openai') {
      this.client = new OpenAI({ apiKey: this.apiKeys.openai });
    } else if (model === 'anthropic') {
      // Anthropic client will be imported dynamically
      this.client = null;
    } else {
      throw new Error(`Unsupported model: ${model}. Supported models: gemini, openai, anthropic`);
    }
  }

  // Get recommended models for different use cases (prioritizing best models)
  static getRecommendedModels() {
    return {
      security: ['claude-3.5-sonnet-20241022', 'gpt-4o', 'gemini-1.5-pro'],
      codeAnalysis: ['claude-3.5-sonnet-20241022', 'gpt-4o', 'gemini-1.5-pro'],
      chat: ['claude-3.5-sonnet-20241022', 'gpt-4o', 'gemini-1.5-pro'],
      costEffective: ['claude-3-haiku-20240307', 'gpt-3.5-turbo', 'gemini-1.5-flash'],
      fastest: ['claude-3-haiku-20240307', 'gpt-3.5-turbo', 'gemini-1.5-flash']
    };
  }

  // Get model information and pricing
  static getModelInfo() {
    return {
      'gemini-1.5-pro': {
        provider: 'Google',
        context: '2M tokens',
        bestFor: 'Complex reasoning, code analysis',
        cost: '~$0.0035/1M input, $0.105/1M output'
      },
      'gemini-1.5-flash': {
        provider: 'Google',
        context: '1M tokens',
        bestFor: 'Fast responses, cost-effective',
        cost: '~$0.000075/1M input, $0.0003/1M output'
      },
      'gpt-4o': {
        provider: 'OpenAI',
        context: '128K tokens',
        bestFor: 'General purpose, high accuracy',
        cost: '~$0.005/1M input, $0.015/1M output'
      },
      'gpt-3.5-turbo': {
        provider: 'OpenAI',
        context: '16K tokens',
        bestFor: 'Fast, cost-effective',
        cost: '~$0.0005/1M input, $0.0015/1M output'
      },
      'claude-3.5-sonnet-20241022': {
        provider: 'Anthropic',
        context: '200K tokens',
        bestFor: 'Reasoning, analysis, safety',
        cost: '~$0.003/1M input, $0.015/1M output'
      },
      'claude-3-haiku-20240307': {
        provider: 'Anthropic',
        context: '200K tokens',
        bestFor: 'Fast, cost-effective',
        cost: '~$0.00025/1M input, $0.00125/1M output'
      }
    };
  }

  async analyzeFile(filePath, content, options = {}) {
    const ext = filePath.split('.').pop();
    const prompt = this.promptEngine.buildPrompt(ext, options.context || '');
    const chunks = this.promptEngine.chunkCode(content, options.maxTokens || 3000);
    const results = [];

    for (const chunk of chunks) {
      const fullPrompt = `${prompt}\n\n${chunk}\n\nImportant: Look for critical vulnerabilities such as SQL injection, XSS, command injection, insecure deserialization, broken access control, SSRF, and logic flaws.`;
      const result = await this.queryLLM(fullPrompt);
      results.push(result);
    }

    return {
      file: filePath,
      insights: results
    };
  }

  async suggestFixes(issues, options = {}) {
    const context = issues.map((i, idx) => `${idx + 1}. ${i.message} [${i.type}]`).join('\n');
    const prompt = `You are an expert AI security assistant. For the following code security issues, suggest exact code fixes with inline examples and explanations.\n\nIssues:\n${context}`;
    const response = await this.queryLLM(prompt);
    return response;
  }

  async summarize(results, options = {}) {
    const summaryInput = results
      .map(r => `File: ${r.file}\nIssues: ${r.issues?.length || 0}\nTypes: ${[...new Set((r.issues || []).map(i => i.type))].join(', ')}`)
      .join('\n\n');

    const prompt = `Generate a high-level executive summary of the following scan report. Include severity trends, recommendations, and vulnerable modules.\n\n${summaryInput}`;
    const response = await this.queryLLM(prompt);
    return response;
  }

  async queryLLM(prompt, options = {}) {
    const spinner = createSpinner('AI thinking...').start();
    try {
      if (this.model === 'gemini') {
        const modelName = options.model || 'gemini-1.5-pro';
        const model = this.client.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        spinner.success({ text: 'AI response ready' });
        return result.response.text();
      } else if (this.model === 'openai') {
        const modelName = options.model || 'gpt-4o';
        const result = await this.client.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: 'You are a precise and advanced AI security auditor and code analyst.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: options.temperature || 0.1,
          max_tokens: options.maxTokens || 4000
        });
        spinner.success({ text: 'AI response ready' });
        return result.choices[0].message.content;
      } else if (this.model === 'anthropic') {
        const { Anthropic } = await import('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: this.apiKeys.anthropic });
        const modelName = options.model || 'claude-3.5-sonnet-20241022';
        
        const result = await client.messages.create({
          model: modelName,
          max_tokens: options.maxTokens || 4000,
          temperature: options.temperature || 0.1,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });
        spinner.success({ text: 'AI response ready' });
        return result.content[0].text;
      }
    } catch (err) {
      spinner.error({ text: 'AI error' });
      return `AI Error: ${err.message}`;
    }
  }

  // Codebase analysis and editing capabilities
  async analyzeCodebase(rootPath, options = {}) {
    const files = await this.scanCodebaseFiles(rootPath);
    const analysis = {
      structure: await this.analyzeCodebaseStructure(files),
      dependencies: await this.analyzeDependencies(rootPath),
      patterns: await this.analyzeCodePatterns(files),
      security: await this.analyzeSecurityPosture(files)
    };
    return analysis;
  }

  async scanCodebaseFiles(rootPath) {
    const patterns = ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx', '**/*.py', '**/*.java', '**/*.go', '**/*.rs'];
    const files = [];
    
    for (const pattern of patterns) {
      const found = await glob(pattern, { 
        cwd: rootPath, 
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
        absolute: true
      });
      files.push(...found);
    }
    
    return [...new Set(files)];
  }

  async analyzeCodebaseStructure(files) {
    const structure = {
      totalFiles: files.length,
      languages: {},
      directories: new Set(),
      complexity: 'analyzing...'
    };
    
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      structure.languages[ext] = (structure.languages[ext] || 0) + 1;
      structure.directories.add(path.dirname(file));
    });
    
    return structure;
  }

  async editFile(filePath, changes, options = {}) {
    if (!options.skipConfirmation) {
      const confirmed = await this.confirmEdit(filePath, changes);
      if (!confirmed) {
        return { success: false, message: 'Edit cancelled by user' };
      }
    }

    try {
      // Backup original file
      const backupPath = `${filePath}.whisper-backup`;
      const originalContent = fs.readFileSync(filePath, 'utf8');
      fs.writeFileSync(backupPath, originalContent);

      // Apply changes
      const newContent = await this.applyChanges(originalContent, changes);
      fs.writeFileSync(filePath, newContent);

      console.log(boxen(
        chalk.green(`✅ Successfully edited ${path.basename(filePath)}`) + '\n' +
        chalk.gray(`Backup saved as: ${path.basename(backupPath)}`),
        { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'green' }
      ));

      return { success: true, backupPath, message: 'File edited successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async confirmEdit(filePath, changes) {
    console.log(boxen(
      chalk.yellow(`🤖 AI wants to edit: ${path.basename(filePath)}`) + '\n\n' +
      chalk.white('Changes to be made:') + '\n' +
      chalk.cyan(changes.description || 'Code improvements and fixes'),
      { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'yellow' }
    ));

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Do you want to proceed with this edit?',
        default: false
      }
    ]);

    return confirmed;
  }

  async applyChanges(originalContent, changes) {
    if (changes.type === 'replace') {
      return changes.newContent;
    } else if (changes.type === 'patch') {
      // Apply specific patches
      let content = originalContent;
      for (const patch of changes.patches) {
        content = content.replace(patch.search, patch.replace);
      }
      return content;
    }
    return originalContent;
  }

  async suggestAndApplyFixes(filePath, issues, options = {}) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixes = await this.generateFixes(content, issues);
    
    if (fixes && fixes.length > 0) {
      const changes = {
        type: 'patch',
        patches: fixes,
        description: `Auto-fix ${issues.length} security issues`
      };
      
      return await this.editFile(filePath, changes, options);
    }
    
    return { success: false, message: 'No fixes could be generated' };
  }

  async generateFixes(content, issues) {
    const prompt = `
As an expert security engineer, provide exact code fixes for these issues:

Original code:
${content}

Issues to fix:
${issues.map((issue, i) => `${i+1}. ${issue.type}: ${issue.message}`).join('\n')}

Provide a JSON array of fixes in this format:
[
  {
    "search": "exact code to replace",
    "replace": "fixed code",
    "description": "what this fix does"
  }
]

Return ONLY the JSON array, no other text.`;

    try {
      const response = await this.queryLLM(prompt);
      return JSON.parse(response.trim());
    } catch (error) {
      console.error('Failed to generate fixes:', error.message);
      return [];
    }
  }

  async interactiveChat(options = {}) {
    const { AIChat } = await import('./chat.js');
    const chat = new AIChat(this);
    await chat.start(options);
  }
}
