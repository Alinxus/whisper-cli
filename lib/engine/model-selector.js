import { AIEngine } from './ai.js';
import chalk from 'chalk';

export class ModelSelector {
  static displayRecommendations() {
    const recommendations = AIEngine.getRecommendedModels();
    const modelInfo = AIEngine.getModelInfo();
    
    console.log(chalk.blue.bold('\n🤖 AI Model Recommendations for Whisper CLI\n'));
    
    Object.entries(recommendations).forEach(([useCase, models]) => {
      console.log(chalk.yellow.bold(`\n${useCase.toUpperCase()}:`));
      models.forEach((model, index) => {
        const info = modelInfo[model];
        if (info) {
          console.log(`  ${index + 1}. ${chalk.green(model)} (${info.provider})`);
          console.log(`     Context: ${info.context} | Cost: ${info.cost}`);
          console.log(`     Best for: ${info.bestFor}`);
        }
      });
    });
    
    console.log(chalk.cyan.bold('\n💡 Model Information:'));
    console.log('  • For security analysis: Use gemini-1.5-pro or gpt-4o');
    console.log('  • For cost-effective development: Use gemini-1.5-flash or gpt-3.5-turbo');
    console.log('  • For best reasoning: Use claude-3.5-sonnet-20241022');
    console.log('\n  AI providers are managed centrally by Whisper backend.');
    console.log('  Simply authenticate with your Whisper account to use all AI features.');
  }

  static getBestModelForUseCase(useCase) {
    const recommendations = AIEngine.getRecommendedModels();
    const models = recommendations[useCase.toLowerCase()];
    
    if (!models || models.length === 0) {
      throw new Error(`No recommendations for use case: ${useCase}`);
    }
    
    return models[0]; // Return the first (best) recommendation
  }

  static async testModel(modelName, apiKey) {
    console.log(chalk.blue(`\n🧪 Testing model: ${modelName}`));
    
    try {
      let engine;
      if (modelName.includes('gemini')) {
        engine = new AIEngine({ model: 'gemini' });
      } else if (modelName.includes('gpt')) {
        engine = new AIEngine({ model: 'openai' });
      } else if (modelName.includes('claude')) {
        engine = new AIEngine({ model: 'anthropic' });
      } else {
        throw new Error(`Unknown model type: ${modelName}`);
      }
      
      const testPrompt = 'Hello! Please respond with "Model test successful" if you can see this message.';
      const response = await engine.queryLLM(testPrompt, { model: modelName });
      
      if (response.includes('successful') || response.length > 0) {
        console.log(chalk.green('✅ Model test successful!'));
        return true;
      } else {
        console.log(chalk.yellow('⚠️  Model responded but may have issues'));
        return false;
      }
    } catch (error) {
      console.log(chalk.red(`❌ Model test failed: ${error.message}`));
      return false;
    }
  }
} 