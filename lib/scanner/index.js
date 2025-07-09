import { glob } from 'glob';
import { readFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import crypto from 'crypto';

export class Scanner {
  async crawl(rootPath, options = {}) {
    const ignore = options.ignore || ['node_modules', '.git', 'dist', 'build'];
    const include = options.include || ['**/*.*'];
    const extensions = options.extensions || ['.js', '.ts', '.json', '.env', '.yml', '.yaml'];

    let files = [];
    for (const pattern of include) {
      files = files.concat(
        glob.sync(pattern, {
          cwd: rootPath,
          ignore,
          nodir: true,
          absolute: true
        })
      );
    }

    files = [...new Set(files)].filter(f => extensions.includes(extname(f)));
    return files;
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
      {
        regex: /api[_-]?key|secret|password|token/i,
        type: 'secret',
        message: 'Possible secret detected'
      },
      {
        regex: /TODO|FIXME/,
        type: 'todo',
        message: 'TODO/FIXME comment found'
      },
      {
        regex: /var\s+/,
        type: 'deprecated',
        message: 'Deprecated var usage, use let/const instead'
      },
      {
        regex: /eval\s*\(/,
        type: 'dangerous',
        message: 'Use of eval is discouraged for security reasons'
      },
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
