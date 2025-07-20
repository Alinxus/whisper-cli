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
  constructor({ authToken = null } = {}) {
    this.authToken = authToken;
    this.promptEngine = new PromptEngine();
    // this.baseUrl = process.env.WHISPER_API_URL || 'http://localhost:5000/api/v1';
  }

  // Get recommended models for different use cases (prioritizing best models)
  static getRecommendedModels() {
    return {
      security: ['claude-3.5-sonnet-20241022', 'gpt-4o', 'gemini-2.5-pro'],
      codeAnalysis: ['claude-3.5-sonnet-20241022', 'gpt-4o', 'gemini-2.5-pro'],
      chat: ['claude-3.5-sonnet-20241022', 'gpt-4o', 'gemini-2.5-pro'],
      costEffective: ['claude-4', 'gpt-4o', 'gemini-2.5-flash'],
      fastest: ['claude-4', 'gpt-4o', 'gemini-2.0-flash']
    };
  }

  // Get all available models
  static getAvailableModels() {
    return [
      'gpt-4o',
      'gpt-4o-mini', 
      'gpt-3.5-turbo',
      'claude-3.5-sonnet-20241022',
      'claude-3.5-haiku-20241022',
      'claude-3-opus-20240229',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro'
    ];
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
      // Only add result if it's not an AI error string
      if (typeof result === 'string' && result.startsWith('AI Error:')) {
        // Skip adding this result
        continue;
      }
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

  // Remove or stub queryLLM (backend proxy), always use queryDirectAPI for AI calls
  async queryLLM(prompt, options = {}) {
    // Always use direct API calls
    return this.queryDirectAPI(prompt, options.model || 'gemini-1.5-pro', options);
  }

  async queryDirectAPI(prompt, modelName, options = {}) {
    // Check for available API keys and use the appropriate service
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    
    if (geminiKey && (modelName.includes('gemini') || !openaiKey && !anthropicKey)) {
      return await this.queryGemini(prompt, geminiKey, options);
    }
    
    if (openaiKey && modelName.includes('gpt')) {
      return await this.queryOpenAI(prompt, modelName, openaiKey, options);
    }
    
    if (anthropicKey && modelName.includes('claude')) {
      return await this.queryAnthropic(prompt, modelName, anthropicKey, options);
    }
    
    // Default to Gemini if available
    if (geminiKey) {
      return await this.queryGemini(prompt, geminiKey, options);
    }
    
    return null;
  }

  async queryGemini(prompt, apiKey, options = {}) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature || 0.1,
          maxOutputTokens: options.maxTokens || 4000,
        },
      });
      
      return result.response.text();
    } catch (error) {
      console.error('Gemini API error:', error.message);
      return null;
    }
  }

  async queryOpenAI(prompt, modelName, apiKey, options = {}) {
    try {
      const openai = new OpenAI({ apiKey });
      
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: 'You are a precise and advanced AI security auditor and code analyst.' },
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature || 0.1,
        max_tokens: options.maxTokens || 4000,
      });
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error.message);
      return null;
    }
  }

  async queryAnthropic(prompt, modelName, apiKey, options = {}) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: options.maxTokens || 4000,
          temperature: options.temperature || 0.1,
          system: 'You are a precise and advanced AI security auditor and code analyst.',
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });
      
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Anthropic API error:', error.message);
      return null;
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
    // Read .whisperignore if present
    let whisperIgnore = [];
    const ignoreFile = path.join(rootPath, '.whisperignore');
    if (fs.existsSync(ignoreFile)) {
      whisperIgnore = fs.readFileSync(ignoreFile, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    }
    const defaultIgnore = [
      'node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**', 'coverage/**', '.cache/**', 'tmp/**', 'temp/**', 'out/**', 'logs/**', 'venv/**', '__pycache__/**', '.DS_Store', '*.log'
    ];
    const ignore = [...new Set([...(defaultIgnore), ...whisperIgnore])];
    const patterns = ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx', '**/*.py', '**/*.java', '**/*.go', '**/*.rs'];
    const files = [];
    
    for (const pattern of patterns) {
      const found = await glob(pattern, { 
        cwd: rootPath, 
        ignore,
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
