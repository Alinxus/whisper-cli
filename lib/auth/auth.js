import { ConfigManager } from '../config/config.js';

export class AuthManager {
  constructor() {
    this.config = new ConfigManager();
    this.tokenKey = 'auth.token';
  }

  async login(options) {
    // Simulate login: accept token or email, store token in config
    let token = options?.token;
    if (!token && options?.email) {
      // Simulate API call to get token by email
      token = 'demo-token-for-' + options.email;
    }
    if (!token) {
      throw new Error('No token or email provided for login');
    }
    await this.config.set(this.tokenKey, token);
    console.log('Login successful. Token saved.');
  }

  async logout() {
    await this.config.set(this.tokenKey, '');
    console.log('Logged out.');
  }

  async status() {
    const token = await this.config.get(this.tokenKey);
    if (token) {
      console.log('Authenticated. Token:', token);
    } else {
      console.log('Not authenticated.');
    }
  }

  async check() {
    // Called on CLI init: throw if not authenticated (for pro features)
    const token = await this.config.get(this.tokenKey);
    if (!token) {
      // Not authenticated, but allow for free tier
      // throw new Error('Not authenticated. Please run `whisper auth login`.');
    }
  }
} 