import { glob } from 'glob';
import { readFileSync, statSync, existsSync } from 'fs';
import { join, extname, dirname, basename } from 'path';
import crypto from 'crypto';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;
import * as yaml from 'js-yaml';
import { createSpinner } from 'nanospinner';

export class Scanner {
  constructor() {
    this.confidence = new Map();
    this.findings = [];
    this.knowledgeBase = this.initializeKnowledgeBase();
  }

  initializeKnowledgeBase() {
    return {
      node: {
        dangerous: [
          'child_process.exec',
          'child_process.spawn', 
          'child_process.execSync',
          'child_process.spawnSync',
          'eval',
          'Function',
          'vm.runInThisContext',
          'vm.runInNewContext',
          'jsonwebtoken.verify({ignoreExpiration:true})',
          'setTimeout([string])',
          'setInterval([string])'
        ],
        insecure: [
          'crypto.createHash("md5")',
          'crypto.createHash("sha1")',
          'crypto.createHmac("md5")',
          'crypto.createHmac("sha1")',
          'Math.random()' // for crypto purposes
        ]
      },
      python: {
        dangerous: [
          'os.system',
          'subprocess.Popen',
          'subprocess.call',
          'subprocess.run',
          'eval',
          'exec',
          'compile',
          '__import__',
          'pickle.loads',
          'pickle.load',
          'input(' // can be dangerous in Python 2
        ],
        insecure: [
          'hashlib.md5',
          'hashlib.sha1',
          'random.random',
          'urllib.urlopen',
          'ssl._create_unverified_context'
        ]
      },
      java: {
        dangerous: [
          'Runtime.getRuntime().exec',
          'ProcessBuilder',
          'Class.forName',
          'Method.invoke',
          'ScriptEngine.eval',
          'XMLDecoder.readObject',
          'ObjectInputStream.readObject'
        ],
        insecure: [
          'MessageDigest.getInstance("MD5")',
          'MessageDigest.getInstance("SHA1")',
          'Random(',
          'TrustManager',
          'HostnameVerifier'
        ]
      },
      go: {
        dangerous: [
          'exec.Command',
          'os.Exec',
          'syscall.Exec',
          'eval.Expr',
          'template.HTML',
          'unsafe.Pointer'
        ],
        insecure: [
          'crypto/md5',
          'crypto/sha1',
          'math/rand',
          'net/http.DefaultTransport',
          'tls.Config{InsecureSkipVerify: true}'
        ]
      },
      php: {
        dangerous: [
          'eval(',
          'exec(',
          'system(',
          'shell_exec(',
          'passthru(',
          'unserialize(',
          'file_get_contents(',
          'include(',
          'require('
        ],
        insecure: [
          'md5(',
          'sha1(',
          'rand(',
          'mysql_query(',
          'extract('
        ]
      },
      ruby: {
        dangerous: [
          'eval(',
          'exec(',
          'system(',
          'send(',
          'instance_eval(',
          'class_eval(',
          'Marshal.load',
          'YAML.load'
        ],
        insecure: [
          'Digest::MD5',
          'Digest::SHA1',
          'Random.rand',
          'Net::HTTP.get',
          'OpenSSL::SSL::VERIFY_NONE'
        ]
      },
      csharp: {
        dangerous: [
          'Process.Start',
          'Assembly.Load',
          'Activator.CreateInstance',
          'Type.GetType',
          'Eval(',
          'XmlDocument.Load'
        ],
        insecure: [
          'MD5.Create',
          'SHA1.Create',
          'Random(',
          'ServicePointManager.ServerCertificateValidationCallback'
        ]
      },
      rust: {
        dangerous: [
          'std::process::Command',
          'unsafe {',
          'transmute',
          'from_raw_parts',
          'eval!('
        ],
        insecure: [
          'md5::',
          'sha1::',
          'rand::random',
          'reqwest::Client::danger_accept_invalid_certs'
        ]
      },
      swift: {
        dangerous: [
          'NSTask(',
          'Process(',
          'dlopen(',
          'NSClassFromString',
          'performSelector'
        ],
        insecure: [
          'CC_MD5',
          'CC_SHA1',
          'arc4random',
          'NSURLSessionConfiguration.ephemeral'
        ]
      },
      kotlin: {
        dangerous: [
          'Runtime.getRuntime().exec',
          'ProcessBuilder',
          'Class.forName',
          'ScriptEngine.eval'
        ],
        insecure: [
          'MessageDigest.getInstance("MD5")',
          'MessageDigest.getInstance("SHA1")',
          'Random.nextInt'
        ]
      },
      secrets: [
        /sk-[a-zA-Z0-9]{48}/,
        /pk-[a-zA-Z0-9]{48}/,
        /AIza[0-9A-Za-z\-_]{35}/,
        /AKIA[0-9A-Z]{16}/,
        /ya29\.[0-9A-Za-z\-_]+/,
        /xox[baprs]-[0-9a-zA-Z]{10,48}/,
        /-----BEGIN (RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
        /ghp_[A-Za-z0-9_]{36}/,
        /gho_[A-Za-z0-9_]{36}/,
        /github_pat_[A-Za-z0-9_]{82}/
      ],
      cors: {
        permissive: [
          'Access-Control-Allow-Origin: *',
          'Access-Control-Allow-Credentials: true'
        ]
      }
    };
  }

  async crawl(rootPath, options = {}) {
    // Read .whisperignore if present
    let whisperIgnore = [];
    const ignoreFile = join(rootPath, '.whisperignore');
    if (existsSync(ignoreFile)) {
      whisperIgnore = readFileSync(ignoreFile, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    }
    // Read .gitignore if present and merge
    let gitIgnore = [];
    const gitIgnoreFile = join(rootPath, '.gitignore');
    if (existsSync(gitIgnoreFile)) {
      gitIgnore = readFileSync(gitIgnoreFile, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    }
    const defaultIgnore = [
      'node_modules', '.git', '.dist', '.build', '.cache', 'coverage', 'tmp', 'temp',
      '.next', 'out', 'logs', 'venv', '__pycache__', '.DS_Store', '*.log'
    ];
    // Merge all ignore patterns, deduplicated
    const ignore = [...new Set([...(options.ignore || []), ...defaultIgnore, ...whisperIgnore, ...gitIgnore])];
    const include = options.include || ['**/*.*'];
    const extensions = options.extensions || ['.js', '.ts', '.jsx', '.tsx', '.json', '.env', '.yml', '.yaml', '.py', '.java', '.go', '.rs', '.php', '.rb', '.cs', '.swift', '.kt', '.scala', '.dockerfile', '.tf', '.hcl'];

    let files = [];
    for (const pattern of include) {
      try {
        const foundFiles = glob.sync(pattern, {
          cwd: rootPath,
          ignore,
          nodir: true,
          absolute: true,
          strict: false
        });
        files = files.concat(foundFiles);
      } catch (error) {
        console.warn(`⚠️  Pattern "${pattern}" failed: ${error.message}`);
      }
    }

    // Remove duplicates and filter by extensions
    files = [...new Set(files)].filter(f => {
      const ext = extname(f);
      return extensions.includes(ext) || basename(f).toLowerCase().includes('dockerfile');
    });

    // Additional check to ensure we only have files, not directories
    const validFiles = [];
    for (const file of files) {
      try {
        const stats = statSync(file);
        if (stats.isFile()) {
          validFiles.push(file);
        }
      } catch (error) {
        console.warn(`⚠️  Skipping invalid file: ${file}`);
      }
    }

    return validFiles;
  }

  filter(files, patterns = {}) {
    let filtered = files;
    if (patterns.ignore && patterns.ignore.length) {
      filtered = filtered.filter(f => !patterns.ignore.some(p => f.includes(p)));
    }
    if (patterns.include && patterns.include.length) {
      filtered = filtered.filter(f => patterns.include.some(p => f.includes(p)));
    }
    return filtered;
  }

  // SAST Lens - Static Analysis Security Testing
  async runSASTLens(file, content) {
    const issues = [];
    const ext = extname(file);
    
    // AST-based analysis for JavaScript/TypeScript
    if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
      try {
        const ast = parse(content, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript', 'decorators-legacy']
        });
        
        traverse(ast, {
          CallExpression: (path) => {
            const callee = path.node.callee;
            
            // Check for dangerous function calls
            if (callee.type === 'Identifier' && callee.name === 'eval') {
              issues.push({
                type: 'dangerous',
                severity: 'critical',
                message: 'Use of eval() can lead to code injection',
                line: path.node.loc?.start.line,
                column: path.node.loc?.start.column,
                fix: 'Use JSON.parse() for JSON data or safer alternatives'
              });
            }
            
            // Check for child_process usage
            if (callee.type === 'MemberExpression' && 
                callee.object.name === 'child_process' &&
                ['exec', 'spawn', 'execSync', 'spawnSync'].includes(callee.property.name)) {
              issues.push({
                type: 'dangerous',
                severity: 'high',
                message: 'Command execution can be dangerous if user input is involved',
                line: path.node.loc?.start.line,
                column: path.node.loc?.start.column,
                fix: 'Use execFile() with array arguments or validate all inputs'
              });
            }
            
            // Check for setTimeout with string
            if (callee.name === 'setTimeout' && 
                path.node.arguments[0]?.type === 'Literal' &&
                typeof path.node.arguments[0].value === 'string') {
              issues.push({
                type: 'dangerous',
                severity: 'high',
                message: 'setTimeout with string argument can lead to code injection',
                line: path.node.loc?.start.line,
                column: path.node.loc?.start.column,
                fix: 'Use function reference instead of string'
              });
            }
          },
          
          // Taint flow analysis - track unsanitized input
          MemberExpression: (path) => {
            const obj = path.node.object;
            const prop = path.node.property;
            
            // Check for req.body, req.query, req.params usage
            if (obj.name === 'req' && 
                ['body', 'query', 'params'].includes(prop.name)) {
              // Look for parent expressions that might be vulnerable
              const parent = path.parent;
              if (parent.type === 'BinaryExpression' && parent.operator === '+') {
                issues.push({
                  type: 'sql_injection',
                  severity: 'critical',
                  message: 'Possible SQL injection - user input concatenated into query',
                  line: path.node.loc?.start.line,
                  column: path.node.loc?.start.column,
                  fix: 'Use parameterized queries or prepared statements'
                });
              }
            }
          }
        });
      } catch (error) {
        // Fallback to regex-based analysis if AST parsing fails
        console.warn(`AST parsing failed for ${file}, using regex fallback`);
        console.warn(`AST parsing error details:`, {
          message: error.message,
          type: error.constructor.name,
          code: error.code,
          line: error.loc?.line,
          column: error.loc?.column,
          reasonCode: error.reasonCode
        });
      }
    }
    
    // Language-specific analysis
    const languageIssues = this.analyzeByLanguage(file, content, ext);
    issues.push(...languageIssues);
    
    // Enhanced regex-based rules
    const rules = [
      // Enhanced secrets detection
      {
        regex: /(api[_-]?key|secret|password|token|private[_-]?key)[^\n]*['\"][A-Za-z0-9\-_\.=]{8,}/i,
        type: 'secret',
        severity: 'critical',
        message: 'Hardcoded secret or credential detected',
        fix: 'Move secrets to environment variables or secure vault'
      },
      {
        regex: /sk-[a-zA-Z0-9]{48}|pk-[a-zA-Z0-9]{48}/,
        type: 'secret',
        severity: 'critical',
        message: 'OpenAI API key detected',
        fix: 'Use environment variables: process.env.OPENAI_API_KEY'
      },
      {
        regex: /AIza[0-9A-Za-z\-_]{35}/,
        type: 'secret',
        severity: 'critical',
        message: 'Google API key detected',
        fix: 'Use environment variables: process.env.GOOGLE_API_KEY'
      },
      {
        regex: /AKIA[0-9A-Z]{16}/,
        type: 'secret',
        severity: 'critical',
        message: 'AWS Access Key ID detected',
        fix: 'Use AWS IAM roles or environment variables'
      },
      {
        regex: /-----BEGIN (RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
        type: 'secret',
        severity: 'critical',
        message: 'Private key detected in source code',
        fix: 'Store private keys in secure key management system'
      },
      // XSS patterns
      {
        regex: /innerHTML\s*=|document\.write\s*\(/i,
        type: 'xss',
        severity: 'high',
        message: 'Possible XSS risk (DOM injection)',
        fix: 'Use textContent or createElement() with proper sanitization'
      },
      // Insecure HTTP
      {
        regex: /http:\/\//i,
        type: 'insecure_transport',
        severity: 'medium',
        message: 'Insecure HTTP URL detected',
        fix: 'Use HTTPS instead of HTTP'
      },
      // Weak cryptography
      {
        regex: /crypto\.(createHash|createHmac)\(['\"](md5|sha1)['\"]\)/i,
        type: 'weak_crypto',
        severity: 'medium',
        message: 'Weak cryptography algorithm used (MD5/SHA1)',
        fix: 'Use SHA-256 or stronger algorithms'
      },
      // Insecure random for crypto
      {
        regex: /Math\.random\(\)/,
        type: 'weak_crypto',
        severity: 'medium',
        message: 'Math.random() is not cryptographically secure',
        fix: 'Use crypto.randomBytes() for security-sensitive operations'
      },
      // Debug logs
      {
        regex: /console\.(log|debug|info)\(/,
        type: 'debug',
        severity: 'low',
        message: 'Debug log found - may leak sensitive information',
        fix: 'Remove debug logs or use proper logging library with levels'
      }
    ];

    // Apply regex rules
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const rule of rules) {
        if (rule.regex.test(line)) {
          issues.push({
            type: rule.type,
            severity: rule.severity ? rule.severity.toUpperCase() : 'MEDIUM',
            message: rule.message,
            line: i + 1,
            column: line.search(rule.regex),
            fix: rule.fix,
            code: line.trim()
          });
        }
      }
    }

    return issues;
  }

  // SDAST Lens - Spec-Driven Analysis Security Testing
  async runSDASTLens(file, content, rootPath) {
    const issues = [];
    
    // Look for API specification files
    const specFiles = [
      'swagger.json', 'swagger.yaml', 'openapi.json', 'openapi.yaml',
      'api-docs.json', 'api-docs.yaml'
    ];
    
    let apiSpec = null;
    for (const specFile of specFiles) {
      const specPath = join(rootPath, specFile);
      if (existsSync(specPath)) {
        try {
          const specContent = readFileSync(specPath, 'utf8');
          apiSpec = specFile.endsWith('.yaml') ? yaml.load(specContent) : JSON.parse(specContent);
          break;
        } catch (error) {
          console.warn(`Failed to parse ${specFile}:`, error.message);
        }
      }
    }
    
    if (!apiSpec) {
      return issues; // No spec found, skip SDAST
    }
    
    // Analyze route security requirements vs implementation
    if (apiSpec.paths) {
      for (const path in apiSpec.paths) {
        const pathObj = apiSpec.paths[path];
        for (const method in pathObj) {
          const operation = pathObj[method];
          
          // Check if operation requires authentication
          if (operation.security || apiSpec.security) {
            // Look for corresponding route handler in code
            const routePattern = path.replace(/{[^}]+}/g, ':[^/]+');
            const routeRegex = new RegExp(`(app|router)\.(${method})\s*\(\s*['\"]${routePattern.replace(/\//g, '\\/')}`,'i');
            
            if (routeRegex.test(content)) {
              // Check if auth middleware is present
              const authMiddlewares = [
                'authenticate', 'auth', 'verifyToken', 'requireAuth',
                'passport.authenticate', 'jwt', 'bearer'
              ];
              
              const hasAuthMiddleware = authMiddlewares.some(middleware => 
                content.includes(middleware)
              );
              
              if (!hasAuthMiddleware) {
                issues.push({
                  type: 'auth_bypass',
                  severity: 'critical',
                  message: `Route ${method.toUpperCase()} ${path} requires authentication but no auth middleware found`,
                  fix: 'Add authentication middleware before route handler'
                });
              }
            }
          }
        }
      }
    }
    
    return issues;
  }

  // IaC & Config Lens - Infrastructure and Configuration Analysis
  async runIaCLens(file, content) {
    const issues = [];
    const ext = extname(file);
    const filename = basename(file).toLowerCase();
    
    // Docker analysis
    if (filename.includes('dockerfile')) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for latest tag
        if (line.match(/FROM\s+[^:]+:latest/i)) {
          issues.push({
            type: 'docker_config',
            severity: 'medium',
            message: 'Using "latest" tag in Docker image',
            line: i + 1,
            fix: 'Use specific version tags for reproducible builds'
          });
        }
        
        // Check for secrets in Dockerfile
        if (line.match(/(ENV|ARG)\s+.*['\"][A-Za-z0-9\-_\.=]{20,}/)) {
          issues.push({
            type: 'secret',
            severity: 'high',
            message: 'Possible hardcoded secret in Dockerfile',
            line: i + 1,
            fix: 'Use Docker secrets or build-time arguments'
          });
        }
        
        // Check for running as root
        if (line.match(/USER\s+root/i)) {
          issues.push({
            type: 'docker_config',
            severity: 'medium',
            message: 'Running container as root user',
            line: i + 1,
            fix: 'Create and use non-root user in container'
          });
        }
      }
    }
    
    // Environment file analysis
    if (filename.includes('.env')) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for exposed secrets
        if (line.match(/^[A-Z_]+=[A-Za-z0-9\-_\.=]{20,}$/)) {
          issues.push({
            type: 'secret',
            severity: 'high',
            message: 'Potential secret in environment file',
            line: i + 1,
            fix: 'Ensure .env files are not committed to version control'
          });
        }
      }
    }
    
    // CORS configuration analysis
    if (content.includes('Access-Control-Allow-Origin')) {
      if (content.includes('Access-Control-Allow-Origin: *')) {
        issues.push({
          type: 'cors_config',
          severity: 'high',
          message: 'Permissive CORS policy allows all origins',
          fix: 'Specify allowed origins explicitly'
        });
      }
      
      if (content.includes('Access-Control-Allow-Credentials: true') && 
          content.includes('Access-Control-Allow-Origin: *')) {
        issues.push({
          type: 'cors_config',
          severity: 'critical',
          message: 'Dangerous CORS configuration: credentials allowed with wildcard origin',
          fix: 'Never use wildcard origin with credentials'
        });
      }
    }
    
    return issues;
  }

  // Real-Flow Fuzz Lens - Runtime Logic Analysis
  async runRealFlowLens(file, content) {
    const issues = [];
    
    // Analyze for potential logic flaws
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for weak JWT verification
      if (line.includes('jwt.verify') && line.includes('ignoreExpiration')) {
        issues.push({
          type: 'auth_bypass',
          severity: 'critical',
          message: 'JWT verification ignores expiration',
          line: i + 1,
          fix: 'Remove ignoreExpiration option or handle expired tokens properly'
        });
      }
      
      // Check for race conditions in async operations
      if (line.includes('async') && line.includes('forEach')) {
        issues.push({
          type: 'race_condition',
          severity: 'medium',
          message: 'Potential race condition with async forEach',
          line: i + 1,
          fix: 'Use for...of loop or Promise.all() for concurrent operations'
        });
      }
      
      // Check for insecure direct object reference
      if (line.match(/\.(findById|findOne)\s*\(\s*req\.(params|query|body)/)) {
        issues.push({
          type: 'idor',
          severity: 'high',
          message: 'Potential Insecure Direct Object Reference',
          line: i + 1,
          fix: 'Add authorization check before accessing object'
        });
      }
    }
    
    return issues;
  }

  // Main analysis method that combines all lenses
  async applyRules(file, content, rootPath = process.cwd()) {
    const allIssues = [];
    
    // Run all security lenses
    const sastIssues = await this.runSASTLens(file, content);
    const sdastIssues = await this.runSDASTLens(file, content, rootPath);
    const iacIssues = await this.runIaCLens(file, content);
    const realFlowIssues = await this.runRealFlowLens(file, content);
    
    allIssues.push(...sastIssues, ...sdastIssues, ...iacIssues, ...realFlowIssues);
    
    // Map all severities to uppercase for backend compatibility
    allIssues.forEach(issue => {
      if (issue.severity) issue.severity = issue.severity.toUpperCase();
    });
    
    // Calculate confidence scores
    const confidence = this.calculateConfidence(allIssues);
    
    // Sort by severity and confidence
    allIssues.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
    
    // Optional: Add file hash or metadata
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    return { 
      file, 
      issues: allIssues, 
      hash, 
      confidence,
      lens: {
        sast: sastIssues.length,
        sdast: sdastIssues.length,
        iac: iacIssues.length,
        realFlow: realFlowIssues.length
      }
    };
  }
  
  calculateConfidence(issues) {
    if (issues.length === 0) return 1.0;
    
    // Higher confidence for issues with specific line numbers and fixes
    const confidenceScore = issues.reduce((acc, issue) => {
      let score = 0.5; // base confidence
      
      if (issue.line) score += 0.2; // has line number
      if (issue.fix) score += 0.2; // has fix suggestion
      if (issue.severity === 'critical') score += 0.1; // critical issues are more likely to be real
      
      return acc + Math.min(score, 1.0);
    }, 0);
    
    return Math.min(confidenceScore / issues.length, 1.0);
  }

  // Language-specific analysis method
  analyzeByLanguage(file, content, ext) {
    const issues = [];
    const lines = content.split('\n');
    
    // Determine language from file extension
    let language = 'unknown';
    const langMap = {
      '.py': 'python',
      '.java': 'java', 
      '.go': 'go',
      '.php': 'php',
      '.rb': 'ruby',
      '.cs': 'csharp',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'java' // Treat Scala similar to Java for now
    };
    
    language = langMap[ext] || 'unknown';
    
    if (language === 'unknown') {
      return issues; // No language-specific rules
    }
    
    // Get language-specific patterns
    const langRules = this.knowledgeBase[language];
    if (!langRules) {
      return issues;
    }
    
    // Check for dangerous patterns
    if (langRules.dangerous) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of langRules.dangerous) {
          if (line.includes(pattern)) {
            issues.push({
              type: 'dangerous',
              severity: 'high',
              message: `Potentially dangerous ${language} function: ${pattern}`,
              line: i + 1,
              column: line.indexOf(pattern),
              fix: this.getSuggestionForPattern(language, pattern, 'dangerous'),
              code: line.trim()
            });
          }
        }
      }
    }
    
    // Check for insecure patterns
    if (langRules.insecure) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of langRules.insecure) {
          if (line.includes(pattern)) {
            issues.push({
              type: 'insecure',
              severity: 'medium',
              message: `Insecure ${language} practice: ${pattern}`,
              line: i + 1,
              column: line.indexOf(pattern),
              fix: this.getSuggestionForPattern(language, pattern, 'insecure'),
              code: line.trim()
            });
          }
        }
      }
    }
    
    // Language-specific additional checks
    switch (language) {
      case 'python':
        issues.push(...this.analyzePython(content, lines));
        break;
      case 'java':
        issues.push(...this.analyzeJava(content, lines));
        break;
      case 'go':
        issues.push(...this.analyzeGo(content, lines));
        break;
      case 'php':
        issues.push(...this.analyzePHP(content, lines));
        break;
      case 'ruby':
        issues.push(...this.analyzeRuby(content, lines));
        break;
      case 'csharp':
        issues.push(...this.analyzeCSharp(content, lines));
        break;
      case 'rust':
        issues.push(...this.analyzeRust(content, lines));
        break;
    }
    
    return issues;
  }
  
  getSuggestionForPattern(language, pattern, type) {
    const suggestions = {
      python: {
        'os.system': 'Use subprocess.run() with shell=False and list arguments',
        'eval': 'Use ast.literal_eval() for safe evaluation of literals',
        'pickle.loads': 'Use json.loads() for data serialization or validate input',
        'hashlib.md5': 'Use hashlib.sha256() or stronger hashing algorithms',
        'random.random': 'Use secrets.randbelow() for cryptographic randomness'
      },
      java: {
        'Runtime.getRuntime().exec': 'Use ProcessBuilder with validated arguments',
        'Class.forName': 'Validate class names and use allowlists',
        'MessageDigest.getInstance("MD5")': 'Use SHA-256 or stronger algorithms',
        'Random(': 'Use SecureRandom for cryptographic operations'
      },
      go: {
        'exec.Command': 'Validate and sanitize all command arguments',
        'unsafe.Pointer': 'Avoid unsafe operations or use with extreme caution',
        'crypto/md5': 'Use crypto/sha256 or stronger hashing',
        'math/rand': 'Use crypto/rand for secure random numbers'
      },
      php: {
        'eval(': 'Remove eval() usage - find alternative approaches',
        'exec(': 'Use escapeshellarg() to sanitize arguments',
        'unserialize(': 'Use json_decode() or validate serialized data',
        'md5(': 'Use password_hash() for passwords or hash("sha256") for data'
      },
      ruby: {
        'eval(': 'Use safer alternatives like instance_variable_get/set',
        'system(': 'Use system() with array arguments to prevent injection',
        'Marshal.load': 'Use JSON.parse or validate marshaled data',
        'Digest::MD5': 'Use Digest::SHA256 or stronger algorithms'
      },
      csharp: {
        'Process.Start': 'Validate and sanitize process arguments',
        'Assembly.Load': 'Use strong-named assemblies and validate sources',
        'MD5.Create': 'Use SHA256.Create() or stronger algorithms',
        'Random(': 'Use RNGCryptoServiceProvider for secure randomness'
      },
      rust: {
        'unsafe {': 'Minimize unsafe code and document safety invariants',
        'std::process::Command': 'Validate command arguments and use .args()',
        'md5::': 'Use sha2::Sha256 or stronger hashing algorithms',
        'rand::random': 'Use rand::rngs::OsRng for cryptographic randomness'
      }
    };
    
    return suggestions[language]?.[pattern] || 'Review this usage for security implications';
  }
  
  // Python-specific analysis
  analyzePython(content, lines) {
    const issues = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for SQL injection patterns
      if (line.match(/cursor\.execute\s*\(.*%.*\)/)) {
        issues.push({
          type: 'sql_injection',
          severity: 'critical',
          message: 'Possible SQL injection using string formatting',
          line: i + 1,
          fix: 'Use parameterized queries with ? placeholders'
        });
      }
      
      // Check for Flask debug mode
      if (line.includes('app.run(debug=True)')) {
        issues.push({
          type: 'debug_mode',
          severity: 'high', 
          message: 'Flask debug mode enabled in production',
          line: i + 1,
          fix: 'Set debug=False in production environments'
        });
      }
    }
    
    return issues;
  }
  
  // Java-specific analysis
  analyzeJava(content, lines) {
    const issues = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for hardcoded database credentials
      if (line.match(/DriverManager\.getConnection\s*\(.*".*password.*"/i)) {
        issues.push({
          type: 'secret',
          severity: 'critical',
          message: 'Hardcoded database credentials detected',
          line: i + 1,
          fix: 'Use environment variables or secure configuration'
        });
      }
      
      // Check for XML External Entity (XXE) vulnerability
      if (line.includes('DocumentBuilderFactory') && !content.includes('setFeature')) {
        issues.push({
          type: 'xxe',
          severity: 'high',
          message: 'XML parser may be vulnerable to XXE attacks',
          line: i + 1,
          fix: 'Disable external entity processing in XML parser'
        });
      }
    }
    
    return issues;
  }
  
  // Go-specific analysis  
  analyzeGo(content, lines) {
    const issues = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for potential race conditions
      if (line.includes('go func') && content.includes('shared')) {
        issues.push({
          type: 'race_condition',
          severity: 'medium',
          message: 'Potential race condition with shared state',
          line: i + 1,
          fix: 'Use sync.Mutex or channels for safe concurrency'
        });
      }
      
      // Check for SQL injection
      if (line.match(/db\.(Query|Exec)\s*\(.*\+.*\)/)) {
        issues.push({
          type: 'sql_injection',
          severity: 'critical',
          message: 'Possible SQL injection using string concatenation',
          line: i + 1,
          fix: 'Use prepared statements with parameter placeholders'
        });
      }
    }
    
    return issues;
  }
  
  // PHP-specific analysis
  analyzePHP(content, lines) {
    const issues = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for register_globals usage
      if (line.includes('register_globals')) {
        issues.push({
          type: 'deprecated_feature',
          severity: 'high',
          message: 'register_globals is deprecated and insecure',
          line: i + 1,
          fix: 'Use $_GET, $_POST, $_SESSION explicitly'
        });
      }
      
      // Check for file inclusion vulnerabilities
      if (line.match(/(include|require)\s*\(\s*\$_[GET|POST]/)) {
        issues.push({
          type: 'file_inclusion',
          severity: 'critical',
          message: 'Potential file inclusion vulnerability',
          line: i + 1,
          fix: 'Validate and whitelist included files'
        });
      }
    }
    
    return issues;
  }
  
  // Ruby-specific analysis
  analyzeRuby(content, lines) {
    const issues = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for mass assignment vulnerabilities
      if (line.match(/\.update\(params\[.*\]\)/)) {
        issues.push({
          type: 'mass_assignment',
          severity: 'high',
          message: 'Potential mass assignment vulnerability',
          line: i + 1,
          fix: 'Use strong parameters to whitelist allowed attributes'
        });
      }
      
      // Check for Rails debug mode
      if (line.includes('config.consider_all_requests_local = true')) {
        issues.push({
          type: 'debug_mode',
          severity: 'medium',
          message: 'Rails debug mode may be enabled',
          line: i + 1,
          fix: 'Set to false in production environments'
        });
      }
    }
    
    return issues;
  }
  
  // C#-specific analysis
  analyzeCSharp(content, lines) {
    const issues = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for potential XXE
      if (line.includes('XmlDocument') && !content.includes('XmlResolver = null')) {
        issues.push({
          type: 'xxe',
          severity: 'high',
          message: 'XML parser may be vulnerable to XXE attacks',
          line: i + 1,
          fix: 'Set XmlResolver = null to disable external entity resolution'
        });
      }
      
      // Check for hardcoded connection strings
      if (line.match(/connectionString.*=.*".*password.*"/i)) {
        issues.push({
          type: 'secret',
          severity: 'critical',
          message: 'Hardcoded database connection string detected',
          line: i + 1,
          fix: 'Use configuration files or environment variables'
        });
      }
    }
    
    return issues;
  }
  
  // Rust-specific analysis
  analyzeRust(content, lines) {
    const issues = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for unwrap() usage
      if (line.includes('.unwrap()') && !line.includes('// SAFETY:')) {
        issues.push({
          type: 'panic_risk',
          severity: 'medium',
          message: 'unwrap() can cause panics at runtime',
          line: i + 1,
          fix: 'Use proper error handling with match or if let'
        });
      }
      
      // Check for unsafe code without documentation
      if (line.includes('unsafe {') && !lines[Math.max(0, i-1)].includes('// SAFETY:')) {
        issues.push({
          type: 'unsafe_code',
          severity: 'high',
          message: 'Unsafe code block without safety documentation',
          line: i + 1,
          fix: 'Add // SAFETY: comment explaining why this unsafe code is safe'
        });
      }
    }
    
    return issues;
  }

  analyze(files) {
    const results = [];
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const result = this.applyRules(file, content);
        results.push(result);
      } catch (err) {
        results.push({ file, error: err.message });
      }
    }
    return results;
  }
}
