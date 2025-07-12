import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export class ConfigManager {
  constructor() {
    this.configPath = join(process.cwd(), 'config', 'whisper.config.json');
    this.config = {};
  }

  async load() {
    try {
      if (existsSync(this.configPath)) {
        this.config = JSON.parse(readFileSync(this.configPath, 'utf8'));
        console.log(`DEBUG: Config loaded from ${this.configPath} ->`, this.config);
      } else {
        this.config = {};
        console.log(`DEBUG: No config file found at ${this.configPath}, using defaults`);
      }
    } catch (error) {
      console.warn('Warning: Could not load config file, using defaults');
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
    try {
      // Support dot notation
      const keys = key.split('.');
      let obj = this.config;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in obj)) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      
      // Ensure directory exists
      const configDir = dirname(this.configPath);
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }
      
      console.log(`DEBUG: Saving ${key}=${JSON.stringify(value)} to ${this.configPath}`);
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      console.log(`DEBUG: Config saved successfully`);
    } catch (error) {
      console.warn('Warning: Could not save config file:', error.message);
    }
  }

  async list() {
    console.log(JSON.stringify(this.config, null, 2));
  }
} 