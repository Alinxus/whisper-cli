import { glob } from 'glob';
import { readFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import crypto from 'crypto';

export class Scanner {
  async crawl(rootPath, options = {}) {
    const ignore = options.ignore || ['node_modules', '.git', '.dist', '.build', '.cache'];
    const include = options.include || ['**/*.*'];
    const extensions = options.extensions || ['.js', '.ts', '.json', '.env', '.yml', '.yaml'];

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
      return extensions.includes(ext);
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

  applyRules(file, content) {
    const issues = [];

    const rules = [
      // Enhanced hardcoded secrets detection
      {
        regex: /(api[_-]?key|secret|password|token|private[_-]?key)[^\n]*['\"][A-Za-z0-9\-_\.=]{8,}/i,
        type: 'secret',
        message: 'Hardcoded secret or credential detected'
      },
      {
        regex: /sk-[a-zA-Z0-9]{48}|pk-[a-zA-Z0-9]{48}/,
        type: 'secret',
        message: 'OpenAI API key detected'
      },
      {
        regex: /AIza[0-9A-Za-z\-_]{35}/,
        type: 'secret',
        message: 'Google API key detected'
      },
      {
        regex: /AKIA[0-9A-Z]{16}/,
        type: 'secret',
        message: 'AWS Access Key ID detected'
      },
      {
        regex: /(github|gitlab|bitbucket)[_-]?token[^\n]*['\"][a-zA-Z0-9]{20,}/i,
        type: 'secret',
        message: 'Git platform token detected'
      },
      // Insecure function usage
      {
        regex: /eval\s*\(/,
        type: 'dangerous',
        message: 'Use of eval is discouraged for security reasons'
      },
      {
        regex: /child_process\.(exec|spawn|execSync|spawnSync)\s*\(/,
        type: 'dangerous',
        message: 'Use of child_process for command execution can be dangerous'
      },
      {
        regex: /setTimeout\s*\(\s*['\"]/,
        type: 'dangerous',
        message: 'Passing a string to setTimeout can lead to code injection'
      },
      // SQL Injection patterns
      {
        regex: /("|')\s*\+\s*req\.(body|query|params)\w*/,
        type: 'sql_injection',
        message: 'Possible SQL injection risk (user input concatenated into query)'
      },
      // XSS patterns
      {
        regex: /innerHTML\s*=|document\.write\s*\(/i,
        type: 'xss',
        message: 'Possible XSS risk (DOM injection)'
      },
      // Insecure HTTP
      {
        regex: /http:\/\//i,
        type: 'insecure_transport',
        message: 'Insecure HTTP URL detected'
      },
      // Weak cryptography
      {
        regex: /crypto\.(createHash|createHmac)\(['\"](md5|sha1)['\"]\)/i,
        type: 'weak_crypto',
        message: 'Weak cryptography algorithm used (MD5/SHA1)'
      },
      // Deprecated APIs
      {
        regex: /var\s+/,
        type: 'deprecated',
        message: 'Deprecated var usage, use let/const instead'
      },
      // TODO/FIXME
      {
        regex: /TODO|FIXME/,
        type: 'todo',
        message: 'TODO/FIXME comment found'
      },
      // Debug logs
      {
        regex: /console\.log\(/,
        type: 'debug',
        message: 'Debug log found (console.log)'
      }
    ];

    for (const rule of rules) {
      if (rule.regex.test(content)) {
        issues.push({ type: rule.type, message: rule.message });
      }
    }

    // Optional: Add file hash or metadata
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    return { file, issues, hash };
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
