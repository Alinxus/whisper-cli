export class PromptEngine {
  buildPrompt(fileType, context) {
    // Build a contextual prompt for the LLM based on file type and context
    let intro = `You are an expert code reviewer. Analyze the following ${fileType} file for security, bugs, and improvements.`;
    if (fileType === 'js' || fileType === 'ts') {
      intro += ' Focus on secrets, insecure patterns, deprecated APIs, and performance.';
    } else if (fileType === 'py') {
      intro += ' Look for hardcoded credentials, unsafe eval, and outdated libraries.';
    } else if (fileType === 'sol') {
      intro += ' Check for reentrancy, integer overflows, and access control.';
    }
    return `${intro}\n\nContext:\n${context}\n\nCode:`;
  }

  chunkCode(content, maxTokens) {
    // Approximate token limit by character count (1 token ≈ 4 chars)
    const maxLen = maxTokens * 4;
    const chunks = [];
    for (let i = 0; i < content.length; i += maxLen) {
      chunks.push(content.slice(i, i + maxLen));
    }
    return chunks;
  }
} 