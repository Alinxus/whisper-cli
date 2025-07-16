import { ConfigManager } from '../config/config.js';
import inquirer from 'inquirer';
import chalk from 'chalk';
import axios from 'axios';

const BASE_URL = process.env.WHISPER_API_URL || 'http://localhost:5000/api/v1';

export class AuthManager {
  constructor() {
    this.config = new ConfigManager();
    this.tokenKey = 'auth.token';
    this.userKey = 'auth.user';
  }

  async login(options = {}) {
    let token = options.token;
    let email = options.email;
    let password = options.password;

    // If token is provided directly, use it
    if (token) {
      try {
        // Save the token directly
        await this.config.set(this.tokenKey, token);
        await this.config.set(this.userKey, { email: email || 'token-user' });
        console.log(chalk.greenBright('✅ Token saved successfully.'));
        return;
      } catch (error) {
        console.error(chalk.red('❌ Failed to save token:', error.message));
        return;
      }
    }

    if (!email || !password) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'email',
          message: 'Enter your email:'
        },
        {
          type: 'password',
          name: 'password',
          message: 'Enter your password:'
        }
      ]);
      email = answers.email;
      password = answers.password;
    }

    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email,
        password
      });

      token = response.data.token;
      const user = response.data.user;

      await this.config.set(this.tokenKey, token);
      await this.config.set(this.userKey, user);

      console.log(chalk.greenBright('✅ Login successful. Token saved.'));
    } catch (error) {
      console.error(chalk.red('❌ Login failed:', error.response?.data?.message || error.message));
    }
  }

  async logout() {
    await this.config.set(this.tokenKey, '');
    await this.config.set(this.userKey, '');
    console.log(chalk.yellow('🔓 Logged out.'));
  }

  async status() {
    await this.config.load();
    const token = await this.config.get(this.tokenKey);
    const user = await this.config.get(this.userKey);
    if (token) {
      console.log(chalk.green(`🔐 Authenticated as ${user.email || 'unknown user'}`));
      console.log(chalk.gray(`Token: ${token.slice(0, 10)}...`));
    } else {
      console.log(chalk.red('❌ Not authenticated.'));
    }
  }

  async check(strict = false) {
    await this.config.load();
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

  async refreshToken() {
    const token = await this.config.get(this.tokenKey);
    try {
      const response = await axios.post(`${BASE_URL}/auth/refresh`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const newToken = response.data.token;
      await this.config.set(this.tokenKey, newToken);

      console.log(chalk.greenBright('🔄 Token refreshed successfully.'));
    } catch (error) {
      console.error(chalk.red('❌ Token refresh failed:', error.response?.data?.message || error.message));
      await this.logout();
    }
  }
}
