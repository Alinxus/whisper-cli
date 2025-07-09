import { AIEngine } from '../lib/engine/ai.js';
import { ModelSelector } from '../lib/engine/model-selector.js';

// Example 1: Display model recommendations
console.log('=== Model Recommendations ===');
ModelSelector.displayRecommendations();

// Example 2: Use the best model for security analysis
async function securityAnalysisExample() {
  console.log('\n=== Security Analysis Example ===');
  
  const bestSecurityModel = ModelSelector.getBestModelForUseCase('security');
  console.log(`Using best security model: ${bestSecurityModel}`);
  
  // Determine which provider to use
  let provider = 'gemini';
  if (bestSecurityModel.includes('gpt')) provider = 'openai';
  if (bestSecurityModel.includes('claude')) provider = 'anthropic';
  
  const engine = new AIEngine({ model: provider });
  
  const codeToAnalyze = `
function login(username, password) {
  const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
  return db.execute(query);
}
  `;
  
  const prompt = `Analyze this code for security vulnerabilities and suggest fixes:\n\n${codeToAnalyze}`;
  
  try {
    const analysis = await engine.queryLLM(prompt, { 
      model: bestSecurityModel,
      temperature: 0.1,
      maxTokens: 2000
    });
    
    console.log('\nSecurity Analysis Result:');
    console.log(analysis);
  } catch (error) {
    console.error('Analysis failed:', error.message);
  }
}

// Example 3: Cost-effective chat
async function costEffectiveChatExample() {
  console.log('\n=== Cost-Effective Chat Example ===');
  
  const costEffectiveModel = ModelSelector.getBestModelForUseCase('costEffective');
  console.log(`Using cost-effective model: ${costEffectiveModel}`);
  
  let provider = 'gemini';
  if (costEffectiveModel.includes('gpt')) provider = 'openai';
  if (costEffectiveModel.includes('claude')) provider = 'anthropic';
  
  const engine = new AIEngine({ model: provider });
  
  const chatPrompt = 'Explain what this Whisper CLI tool does in simple terms.';
  
  try {
    const response = await engine.queryLLM(chatPrompt, { 
      model: costEffectiveModel,
      temperature: 0.7,
      maxTokens: 500
    });
    
    console.log('\nChat Response:');
    console.log(response);
  } catch (error) {
    console.error('Chat failed:', error.message);
  }
}

// Example 4: Test a specific model
async function testModelExample() {
  console.log('\n=== Model Testing Example ===');
  
  // Test if Gemini is working
  const isWorking = await ModelSelector.testModel('gemini-1.5-pro');
  console.log(`Gemini 1.5 Pro working: ${isWorking}`);
}

// Run examples
async function runExamples() {
  try {
    await securityAnalysisExample();
    await costEffectiveChatExample();
    await testModelExample();
  } catch (error) {
    console.error('Example failed:', error.message);
  }
}

// Export for use in other files
export { runExamples, securityAnalysisExample, costEffectiveChatExample, testModelExample };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples();
} 