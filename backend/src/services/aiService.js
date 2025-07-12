import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

class AIService {
  constructor() {
    // Initialize AI clients with environment variables
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;

    this.gemini = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY
    ) : null;

    this.anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    }) : null;
  }

  async query({ model, prompt, temperature = 0.1, maxTokens = 4000, systemPrompt = 'You are a helpful assistant.' }) {
    try {
      // Determine which AI provider to use based on model
      if (model.startsWith('gpt-')) {
        return await this.queryOpenAI({ model, prompt, temperature, maxTokens, systemPrompt });
      } else if (model.startsWith('gemini-')) {
        return await this.queryGemini({ model, prompt, temperature, maxTokens, systemPrompt });
      } else if (model.startsWith('claude-')) {
        return await this.queryAnthropic({ model, prompt, temperature, maxTokens, systemPrompt });
      } else {
        throw new Error(`Unsupported model: ${model}`);
      }
    } catch (error) {
      console.error('AI query failed:', error);
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  async queryOpenAI({ model, prompt, temperature, maxTokens, systemPrompt }) {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: temperature,
      max_tokens: maxTokens
    });

    return response.choices[0].message.content;
  }

  async queryGemini({ model, prompt, temperature, maxTokens, systemPrompt }) {
    if (!this.gemini) {
      throw new Error('Gemini API key not configured');
    }

    const genModel = this.gemini.getGenerativeModel({ model: model });
    const fullPrompt = `${systemPrompt}\n\nUser: ${prompt}`;
    
    const result = await genModel.generateContent(fullPrompt);
    return result.response.text();
  }

  async queryAnthropic({ model, prompt, temperature, maxTokens, systemPrompt }) {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await this.anthropic.messages.create({
      model: model,
      max_tokens: maxTokens,
      temperature: temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    return response.content[0].text;
  }

  // Get available models based on configured API keys
  getAvailableModels() {
    const models = [];

    if (this.openai) {
      models.push(
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-3.5-turbo'
      );
    }

    if (this.gemini) {
      models.push(
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.0-pro'
      );
    }

    if (this.anthropic) {
      models.push(
        'claude-3.5-sonnet-20241022',
        'claude-3.5-haiku-20241022',
        'claude-3-opus-20240229'
      );
    }

    return models;
  }

  // Check if a specific model is available
  isModelAvailable(model) {
    return this.getAvailableModels().includes(model);
  }
}

// Simulate AI service for development (when no API keys are provided)
async function simulateAIService({ model, prompt, temperature, maxTokens, systemPrompt }) {
  // If we have actual API keys, use the real service
  const aiService = new AIService();
  const availableModels = aiService.getAvailableModels();

  if (availableModels.length > 0 && aiService.isModelAvailable(model)) {
    return await aiService.query({ model, prompt, temperature, maxTokens, systemPrompt });
  }

  // Fallback: simulate AI response for development
  console.log('No AI API keys configured, using simulated response');
  
  // Simple simulation based on prompt content
  if (prompt.toLowerCase().includes('security') || prompt.toLowerCase().includes('vulnerability')) {
    return `This is a simulated security analysis response for model ${model}. 

The code appears to have the following potential security considerations:
1. Input validation should be implemented
2. Consider using parameterized queries to prevent SQL injection
3. Implement proper authentication and authorization
4. Use HTTPS for secure communication

Note: This is a simulated response. Configure AI API keys in your .env file for real AI analysis.`;
  }

  if (prompt.toLowerCase().includes('explain') || prompt.toLowerCase().includes('code')) {
    return `This is a simulated code explanation for model ${model}.

The code performs the following operations:
1. Processes user input
2. Applies business logic
3. Returns results

For production use, please configure AI API keys in your .env file to get real AI-powered explanations.`;
  }

  return `This is a simulated AI response using model ${model}. 

Your prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"

To get real AI responses, please configure the appropriate API keys in your .env file:
- OPENAI_API_KEY for GPT models
- GEMINI_API_KEY for Gemini models  
- ANTHROPIC_API_KEY for Claude models`;
}

export { AIService, simulateAIService };
export default AIService;
