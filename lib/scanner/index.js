import glob from 'glob';
import { readFileSync, statSync } from 'fs';
import { join, extname } from 'path';

export class Scanner {
  async crawl(rootPath, options = {}) {
    // Recursively crawl files, respecting ignore/include patterns
    const ignore = options.ignore || ['node_modules', '.git', 'dist', 'build'];
    const include = options.include || ['**/*.*'];
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
    // Remove duplicates
    files = [...new Set(files)];
    return files;
  }

  filter(files, patterns = {}) {
    // Filter files by include/ignore patterns
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
    // Simple static rules: secrets, TODOs, deprecated usage
    const issues = [];
    if (/api[_-]?key|secret|password|token/i.test(content)) {
      issues.push({ type: 'secret', message: 'Possible secret detected' });
    }
    if (/TODO|FIXME/.test(content)) {
      issues.push({ type: 'todo', message: 'TODO/FIXME found' });
    }
    if (/var\s+/.test(content)) {
      issues.push({ type: 'deprecated', message: 'Deprecated var usage' });
    }
    return issues;
  }
} 