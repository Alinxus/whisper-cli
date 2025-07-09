import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

export class ConfigManager {
  constructor() {
    this.configPath = join(process.cwd(), 'config', 'whisper.config.json');
    this.config = {};
  }

  async load() {
    if (existsSync(this.configPath)) {
      this.config = JSON.parse(readFileSync(this.configPath, 'utf8'));
    } else {
      this.config = {};
    }
  }

  async get(key) {
    // Support dot notation (e.g., 'auth.token')
    const keys = key.split('.');
    let value = this.config;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }
    return value;
  }

  async set(key, value) {
    // Support dot notation
    const keys = key.split('.');
    let obj = this.config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in obj)) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
  }

  async list() {
    console.log(JSON.stringify(this.config, null, 2));
  }
} 