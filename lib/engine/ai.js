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
      security: ['gemini-2.5-pro', 'gpt-4o', 'claude-3.5-sonnet-20241022'],
      codeAnalysis: ['gemini-2.5-pro', 'gpt-4o', 'claude-3.5-sonnet-20241022'],
      chat: ['gemini-2.5-pro', 'gpt-4o', 'claude-3.5-sonnet-20241022'],
      costEffective: ['gemini-2.0-flash-exp', 'gpt-4o-mini', 'claude-3.5-haiku-20241022'],
      fastest: ['gemini-2.0-flash-exp', 'gpt-4o-mini', 'claude-3.5-haiku-20241022']
    };
  }

  // Get all available models
  static getAvailableModels() {
    return [
      'gemini-2.5-pro',
      'gpt-4o',
      'gpt-4o-mini', 
      'gpt-3.5-turbo',
      'claude-3.5-sonnet-20241022',
      'claude-3.5-haiku-20241022',
      'claude-3-opus-20240229',
      'gemini-2.0-flash-exp',
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
  const fullPrompt = `
You are a world-class secure code auditor and AI vulnerability scanner. 
Analyze the following code snippet thoroughly.

Code:
${chunk}

Your mission:
- Identify **security vulnerabilities**, both obvious and subtle.
- Include critical threats like:
  - SQL Injection
  - XSS (Cross-site Scripting)
  - Command Injection
  - Insecure Deserialization
  - Broken Access Control
  - SSRF (Server-Side Request Forgery)
  - Logic flaws and bypasses
  - Hardcoded secrets or API keys
  - Unsafe use of eval, exec, or system commands
  - Unsanitized inputs or unsafe data flows
  - Insecure configuration or default credentials

Additional goals:
- Pay attention to context-specific risks (e.g., server-side vs client-side).
- Highlight vulnerable dependencies or outdated packages if visible.
- Suggest **clear remediations** for each vulnerability you find.

Respond in structured markdown format:
\`\`\`markdown
## Vulnerabilities

1. **[Vulnerability Name]**
   - **Severity**: [Low / Medium / High / Critical]
   - **Explanation**: [What it is and how it works]
   - **Code Reference**: [Line or pattern if possible]
   - **Remediation**: [What should be done]

...

## Overall Risk Rating: [Low / Medium / High / Critical]
\`\`\`

Be precise, technical, and avoid hallucinations. If nothing is found, respond with:
\`No critical vulnerabilities found in this chunk.\`
`;

  const result = await this.queryLLM(fullPrompt);

  if (typeof result === 'string' && result.startsWith('AI Error:')) {
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
  const prompt = `
You are a senior application security engineer and code auditor.

Below is a list of detected code security issues. For each issue:
- Suggest an exact code fix.
- Provide **inline code examples** showing before and after.
- Explain **why** the fix works and how it mitigates the vulnerability.
- Prioritize fixes by **severity** and exploitability.

### Issues to fix:
${context}

Respond in structured markdown:
\`\`\`markdown
### [Issue Title]

- **Type**: [e.g., SQL Injection]
- **Severity**: [Low / Medium / High / Critical]
- **Explanation**: [Brief but technical]
- **Fix (Before ➜ After)**:
\`\`\`[language]
// Before
...

// After
...
\`\`\`
- **Why it works**: [Short reasoning]

...
\`\`\`
If a fix is uncertain or speculative, clearly say so.
`;

  const response = await this.queryLLM(prompt);
  return response;
}

 async summarize(results, options = {}) {
  const summaryInput = results
    .map(r => `File: ${r.file}\nIssues: ${r.issues?.length || 0}\nTypes: ${[...new Set((r.issues || []).map(i => i.type))].join(', ')}`)
    .join('\n\n');

  const prompt = `
You are a cybersecurity analyst tasked with generating a high-level executive summary of an application vulnerability scan.

Please:
- Identify overall severity trends (e.g. mostly medium or high).
- List the most common vulnerability types and affected files.
- Recommend actionable next steps for the dev team.
- Mention any concerning patterns like repeated issues or insecure practices across multiple files.
- Highlight high-risk modules or hotspots.

### Raw Scan Data:
${summaryInput}

Respond in structured markdown format:
\`\`\`markdown
## Executive Summary

- **Total Files Scanned**: X
- **Total Issues Detected**: Y
- **Severity Distribution**:
  - Critical: #
  - High: #
  - Medium: #
  - Low: #

## Top Vulnerability Types
1. XSS
2. SQL Injection
...

## Affected Modules
- auth.js (5 issues)
- userController.ts (3 issues)

## Key Observations
- Repeated use of unsanitized inputs
- Missing authorization checks in 4 modules

## Recommendations
- Apply proper input validation
- Refactor role-based access logic
- Patch outdated libraries flagged in reports
...

## Overall Risk Rating: [Low / Medium / High / Critical]
\`\`\`
`;

  const response = await this.queryLLM(prompt);
  return response;
}


  // Multi-model AI system that uses all available API keys
  async queryLLM(prompt, options = {}) {
    // Get the best available model based on user's API keys
    const bestModel = this.getBestAvailableModel();
    if (!bestModel) {
      throw new Error('No AI API keys configured. Please add GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY to your .env file.');
    }
    
    return this.queryDirectAPI(prompt, options.model || bestModel, options);
  }

  // Determine the best available model based on configured API keys
  getBestAvailableModel() {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    
    // Priority order: Gemini 2.5 Pro > GPT-4o > Claude 3.5 Sonnet
    if (geminiKey) return 'gemini-2.5-pro';
    if (openaiKey) return 'gpt-4o';
    if (anthropicKey) return 'claude-3.5-sonnet-20241022';
    
    return null;
  }

  // Get all available models based on configured API keys
  getAvailableModelsForUser() {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    
    const available = [];
    if (geminiKey) {
      available.push('gemini-2.5-pro', 'gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash');
    }
    if (openaiKey) {
      available.push('gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo');
    }
    if (anthropicKey) {
      available.push('claude-3.5-sonnet-20241022', 'claude-3.5-haiku-20241022');
    }
    
    return available;
  }

  async queryDirectAPI(prompt, modelName, options = {}) {
    // Check for available API keys and use the appropriate service
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    
    // Route to appropriate AI service based on model name
    if (modelName.includes('gemini')) {
      if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');
      return await this.queryGemini(prompt, geminiKey, { ...options, model: modelName });
    }
    
    if (modelName.includes('gpt')) {
      if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');
      return await this.queryOpenAI(prompt, modelName, openaiKey, options);
    }
    
    if (modelName.includes('claude')) {
      if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');
      return await this.queryAnthropic(prompt, modelName, anthropicKey, options);
    }
    
    // Fallback to best available model
    const fallbackModel = this.getBestAvailableModel();
    if (fallbackModel && fallbackModel !== modelName) {
      console.warn(`Model ${modelName} not available, falling back to ${fallbackModel}`);
      return await this.queryDirectAPI(prompt, fallbackModel, options);
    }
    
    throw new Error(`No API key available for model: ${modelName}`);
  }

  async queryGemini(prompt, apiKey, options = {}) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      // Use the specified model or default to gemini-2.0-flash-exp
      const modelName = options.model && options.model.includes('gemini') ? 
        options.model : 'gemini-2.0-flash-exp';
      
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature || 0.1,
          maxOutputTokens: options.maxTokens || 4000,
        },
      });
      
      return result.response.text();
    } catch (error) {
      console.error(`Gemini API error (${options.model || 'gemini-2.0-flash-exp'}):`, error.message);
      // Fallback to gemini-1.5-flash if gemini-2.0-flash-exp fails
      if (options.model === 'gemini-2.0-flash-exp' || !options.model) {
        try {
          console.log('Falling back to gemini-1.5-flash...');
          const genAI = new GoogleGenerativeAI(apiKey);
          const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          
          const result = await fallbackModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: options.temperature || 0.1,
              maxOutputTokens: options.maxTokens || 4000,
            },
          });
          
          return result.response.text();
        } catch (fallbackError) {
          console.error('Gemini fallback also failed:', fallbackError.message);
          return null;
        }
      }
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

  async analyzeDependencies(rootPath) {
    try {
      const packageJsonPath = path.join(rootPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return {
          dependencies: Object.keys(packageData.dependencies || {}),
          devDependencies: Object.keys(packageData.devDependencies || {}),
          totalCount: (Object.keys(packageData.dependencies || {}).length + 
                      Object.keys(packageData.devDependencies || {}).length)
        };
      }
    } catch (error) {
      // No package.json or error reading it
    }
    return { dependencies: [], devDependencies: [], totalCount: 0 };
  }

  async analyzeCodePatterns(files) {
    const patterns = {
      totalFunctions: 0,
      asyncFunctions: 0,
      classes: 0,
      imports: 0,
      exports: 0
    };
    
    // Sample a few files for pattern analysis
    const sampleFiles = files.slice(0, Math.min(10, files.length));
    
    for (const filePath of sampleFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        patterns.totalFunctions += (content.match(/function\s+\w+/g) || []).length;
        patterns.totalFunctions += (content.match(/const\s+\w+\s*=\s*\(/g) || []).length;
        patterns.asyncFunctions += (content.match(/async\s+function/g) || []).length;
        patterns.asyncFunctions += (content.match(/async\s+\w+/g) || []).length;
        patterns.classes += (content.match(/class\s+\w+/g) || []).length;
        patterns.imports += (content.match(/import\s+/g) || []).length;
        patterns.exports += (content.match(/export\s+/g) || []).length;
      } catch (error) {
        // Skip files we can't read
      }
    }
    
    return patterns;
  }

  async analyzeSecurityPosture(files) {
    const securityIndicators = {
      potentialVulnerabilities: 0,
      hasAuth: false,
      hasValidation: false,
      hasCrypto: false
    };
    
    // Sample analysis of security patterns
    const sampleFiles = files.slice(0, Math.min(5, files.length));
    
    for (const filePath of sampleFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8').toLowerCase();
        
        // Basic security pattern detection
        if (content.includes('password') && !content.includes('hash')) {
          securityIndicators.potentialVulnerabilities++;
        }
        if (content.includes('auth') || content.includes('login')) {
          securityIndicators.hasAuth = true;
        }
        if (content.includes('validate') || content.includes('sanitize')) {
          securityIndicators.hasValidation = true;
        }
        if (content.includes('crypto') || content.includes('encrypt')) {
          securityIndicators.hasCrypto = true;
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
    
    return securityIndicators;
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
