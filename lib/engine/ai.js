import { PromptEngine } from './prompt.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export class AIEngine {
  constructor({ model = 'gemini', apiKeys = {} } = {}) {
    this.model = model;
    this.promptEngine = new PromptEngine();
    this.apiKeys = apiKeys;

    if (model === 'gemini') {
      this.client = new GoogleGenerativeAI(apiKeys.google);
    } else if (model === 'openai') {
      this.client = new OpenAI({ apiKey: apiKeys.openai });
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
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

  async queryLLM(prompt) {
    try {
      if (this.model === 'gemini') {
        const model = this.client.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } else if (this.model === 'openai') {
        const result = await this.client.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a precise and advanced AI security auditor and code analyst.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        });
        return result.choices[0].message.content;
      }
    } catch (err) {
      return `AI Error: ${err.message}`;
    }
  }
}
