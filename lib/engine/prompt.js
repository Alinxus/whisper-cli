export class PromptEngine {
  constructor() {
    this.securityPrompts = this.initializeSecurityPrompts();
  }

  initializeSecurityPrompts() {
    return {
      vulnerability_detection: `You are an elite security consultant with 15+ years of experience in application security. 
Your task is to perform a comprehensive security audit of the provided code.

Focus on these critical vulnerability classes:
1. INJECTION FLAWS: SQL injection, NoSQL injection, LDAP injection, OS command injection, XSS
2. BROKEN AUTHENTICATION: Weak password policies, session management flaws, JWT issues
3. SENSITIVE DATA EXPOSURE: Hardcoded secrets, weak cryptography, insecure storage
4. BROKEN ACCESS CONTROL: IDOR, privilege escalation, missing authorization checks
5. SECURITY MISCONFIGURATIONS: Default configs, unnecessary features, insecure headers
6. VULNERABLE COMPONENTS: Outdated libraries, known CVEs
7. INSUFFICIENT LOGGING: Missing security events, inadequate monitoring
8. INSECURE DESERIALIZATION: Unsafe object deserialization
9. KNOWN VULNERABILITIES: CVE patterns, security anti-patterns
10. BUSINESS LOGIC FLAWS: Race conditions, workflow bypasses, state manipulation

For each finding, provide:
- Severity: CRITICAL/HIGH/MEDIUM/LOW
- Confidence: 0.0-1.0 (how certain you are)
- Exploitation scenario: How an attacker would exploit this
- Business impact: What damage could result
- Fix: Specific code changes needed
- Prevention: How to prevent similar issues

Be thorough but precise. Flag only real vulnerabilities, not theoretical possibilities.`,

      code_review: `You are performing a security-focused code review. Analyze the code for:

1. SECURITY VULNERABILITIES:
   - Input validation bypasses
   - Authentication/authorization flaws
   - Cryptographic weaknesses
   - Information disclosure
   - Injection vulnerabilities

2. SECURITY ANTI-PATTERNS:
   - Hardcoded credentials
   - Weak random number generation
   - Insecure defaults
   - Missing security headers
   - Unsafe API usage

3. DEFENSIVE PROGRAMMING:
   - Error handling security
   - Input sanitization
   - Output encoding
   - Secure coding practices

Provide actionable recommendations with specific code examples.`,

      fix_generation: `You are an expert security engineer tasked with fixing security vulnerabilities.

For each vulnerability:
1. Explain the root cause
2. Provide secure code replacement
3. Explain why the fix works
4. Suggest additional security measures
5. Reference relevant security standards (OWASP, NIST, CWE)

Generate production-ready, secure code that follows security best practices.
Ensure fixes don't introduce new vulnerabilities or break existing functionality.`,

      compliance_check: `You are auditing code for compliance with security standards:

- OWASP Top 10 (2021)
- NIST Cybersecurity Framework
- CWE/SANS Top 25
- Industry-specific standards (PCI DSS, HIPAA, SOX)

Identify compliance gaps and provide remediation guidance.`,

      threat_modeling: `Perform threat modeling on this code:

1. ASSETS: What valuable data/functionality exists?
2. THREATS: What attacks are possible?
3. VULNERABILITIES: What weaknesses enable attacks?
4. COUNTERMEASURES: What protections are in place?

Use STRIDE methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).`
    };
  }

  buildPrompt(fileType, context = '', promptType = 'vulnerability_detection') {
    const basePrompt = this.securityPrompts[promptType] || this.securityPrompts.vulnerability_detection;
    
    const fileTypeGuidance = this.getFileTypeGuidance(fileType);
    const contextualPrompt = context ? `\n\nAdditional Context: ${context}` : '';
    
    return `${basePrompt}\n\n${fileTypeGuidance}${contextualPrompt}\n\nCode to analyze:`;
  }

  getFileTypeGuidance(fileType) {
    const guidance = {
      '.js': 'JavaScript-specific concerns: Prototype pollution, XSS, CSRF, dependency vulnerabilities, async/await security',
      '.ts': 'TypeScript-specific concerns: Type safety bypasses, any usage, assertion security, decorator vulnerabilities',
      '.py': 'Python-specific concerns: Code injection, pickle vulnerabilities, path traversal, SQL injection, SSRF',
      '.java': 'Java-specific concerns: Deserialization, XML external entities, LDAP injection, path traversal',
      '.go': 'Go-specific concerns: Memory safety, concurrency issues, input validation, crypto misuse',
      '.php': 'PHP-specific concerns: File inclusion, SQL injection, XSS, session hijacking, code execution',
      '.rb': 'Ruby-specific concerns: Code injection, mass assignment, XSS, SQL injection, unsafe YAML',
      '.cs': 'C#-specific concerns: Deserialization, XSS, SQL injection, path traversal, crypto issues',
      '.dockerfile': 'Docker-specific concerns: Secrets in layers, privilege escalation, resource limits, base image vulnerabilities',
      '.yaml': 'YAML-specific concerns: Deserialization attacks, configuration exposure, injection through templates',
      '.json': 'JSON-specific concerns: Prototype pollution, schema validation, sensitive data exposure',
      '.env': 'Environment-specific concerns: Hardcoded secrets, privilege escalation, configuration drift'
    };
    
    return guidance[fileType] || 'General security analysis focusing on common vulnerability patterns.';
  }

  buildFixPrompt(vulnerability, codeContext) {
    return `${this.securityPrompts.fix_generation}\n\nVulnerability Details:\n${JSON.stringify(vulnerability, null, 2)}\n\nCode Context:\n${codeContext}\n\nProvide a secure fix:`;
  }

  buildEducationalPrompt(vulnerability) {
    return `Explain this security vulnerability in an educational context:\n\n${JSON.stringify(vulnerability, null, 2)}\n\nProvide:\n1. What is this vulnerability?\n2. Why is it dangerous?\n3. How do attackers exploit it?\n4. How to prevent it?\n5. Real-world examples\n6. Relevant OWASP/CWE references\n\nMake it accessible for developers at all skill levels.`;
  }

  chunkCode(code, maxTokens = 3000) {
    const lines = code.split('\n');
    const chunks = [];
    let currentChunk = '';
    let currentTokens = 0;
    
    for (const line of lines) {
      const lineTokens = line.length / 4; // Rough token estimation
      
      if (currentTokens + lineTokens > maxTokens && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = line;
        currentTokens = lineTokens;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
        currentTokens += lineTokens;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [code];
  }

  // Generate context-aware prompts based on findings
  generateContextualPrompt(findings, codeContext) {
    const criticalFindings = findings.filter(f => f.severity === 'critical');
    const highFindings = findings.filter(f => f.severity === 'high');
    
    if (criticalFindings.length > 0) {
      return `CRITICAL SECURITY REVIEW NEEDED:\n\nMultiple critical vulnerabilities detected. Focus on:\n${criticalFindings.map(f => `- ${f.type}: ${f.message}`).join('\n')}\n\nCode Context:\n${codeContext}\n\nProvide immediate remediation steps:`;
    }
    
    if (highFindings.length > 0) {
      return `HIGH PRIORITY SECURITY REVIEW:\n\nHigh-severity issues detected:\n${highFindings.map(f => `- ${f.type}: ${f.message}`).join('\n')}\n\nCode Context:\n${codeContext}\n\nProvide remediation guidance:`;
    }
    
    return this.buildPrompt('general', codeContext, 'code_review');
  }
}
