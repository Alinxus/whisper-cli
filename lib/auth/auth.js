import { ConfigManager } from '../config/config.js';
import inquirer from 'inquirer';
import chalk from 'chalk';

export class AuthManager {
  constructor() {
    this.config = new ConfigManager();
    this.tokenKey = 'auth.token';
    this.userKey = 'auth.user';
  }

  async login(options = {}) {
    let token = options.token;
    let email = options.email;

    if (!token && !email) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'email',
          message: 'Enter your email:'
        }
      ]);
      email = answers.email;
    }

    if (!token && email) {
      // Simulate API call
      token = 'demo-token-for-' + email;
    }

    if (!token) {
      throw new Error('No token or email provided for login.');
    }

    await this.config.set(this.tokenKey, token);
    await this.config.set(this.userKey, email || 'anonymous');

    console.log(chalk.greenBright('✅ Login successful. Token saved.'));
  }

  async logout() {
    await this.config.set(this.tokenKey, '');
    await this.config.set(this.userKey, '');
    console.log(chalk.yellow('🔓 Logged out.'));
  }

  async status() {
    const token = await this.config.get(this.tokenKey);
    const user = await this.config.get(this.userKey);
    if (token) {
      console.log(chalk.green(`🔐 Authenticated as ${user || 'unknown user'}`));
      console.log(chalk.gray(`Token: ${token.slice(0, 10)}...`));
    } else {
      console.log(chalk.red('❌ Not authenticated.'));
    }
  }

  async check(strict = false) {
    const token = await this.config.get(this.tokenKey);
    if (!token && strict) {
      throw new Error('Not authenticated. Please run `whisper auth login`.');
    }
    return !!token;
  }

  async getToken() {
    return await this.config.get(this.tokenKey);
  }

  async getUser() {
    return await this.config.get(this.userKey);
  }
}
