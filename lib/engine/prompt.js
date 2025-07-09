export class PromptEngine {
  buildPrompt(fileType, context) {
    let intro = `You are an expert AI code reviewer. Analyze the following ${fileType.toUpperCase()} file for security flaws, logic bugs, deprecated syntax, performance issues, and best practices.`;

    switch (fileType) {
      case 'js':
      case 'ts':
        intro += ' Focus on secrets, insecure patterns, async error handling, code smells, and deprecated APIs.';
        break;
      case 'py':
        intro += ' Look for insecure input handling, use of unsafe libraries, hardcoded credentials, and performance bottlenecks.';
        break;
      case 'sol':
        intro += ' Review for reentrancy, integer overflows, improper access control, and gas optimization issues.';
        break;
      case 'java':
        intro += ' Detect unsafe input validation, insecure object serialization, and poor memory management patterns.';
        break;
      case 'json':
      case 'yaml':
      case 'yml':
        intro += ' Validate structural correctness, insecure configurations, and sensitive data exposure.';
        break;
      case 'html':
      case 'css':
        intro += ' Inspect for inline styles, legacy layouts, unused classes, and semantic structure.';
        break;
      default:
        intro += ' Look for general code quality issues and any sensitive data exposure and check for harmful codes and major attacks by hackers , sql injection ,xss ect , focus on etc so do all major attacks scan.';
    }

    return `${intro}\n\nContext:\n${context || 'None'}\n\nCode:`;
  }

  chunkCode(content, maxTokens = 3000) {
    const maxLen = maxTokens * 4; // Approximate 1 token = 4 chars
    const lines = content.split('\n');
    const chunks = [];
    let buffer = '';

    for (const line of lines) {
      if ((buffer.length + line.length + 1) < maxLen) {
        buffer += line + '\n';
      } else {
        chunks.push(buffer.trim());
        buffer = line + '\n';
      }
    }

    if (buffer.length > 0) {
      chunks.push(buffer.trim());
    }

    return chunks;
  }
}
