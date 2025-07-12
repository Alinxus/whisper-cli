import { ConfigManager } from '../config/config.js';
import chalk from 'chalk';
export class Analytics {
  constructor() {
    this.config = new ConfigManager();
    this.analyticsKey = 'analytics.usage';
  }

  async init() {
    await this.config.load();
    const existing = await this.config.get(this.analyticsKey);
    if (!existing) {
      await this.config.set(this.analyticsKey, {});
    }
  }

  async record(command) {
    const usage = (await this.config.get(this.analyticsKey)) || {};
    usage[command] = (usage[command] || 0) + 1;
    await this.config.set(this.analyticsKey, usage);
  }

  async usage(options = {}) {
    const usage = await this.config.get(this.analyticsKey);
    if (!usage || Object.keys(usage).length === 0) {
      console.log(chalk.yellow('⚠️  No usage data recorded yet.'));
      return;
    }

    console.log(chalk.cyan.bold('\n📊 Whisper CLI Usage Analytics'));
    const entries = Object.entries(usage).sort((a, b) => b[1] - a[1]);
    for (const [command, count] of entries) {
      console.log(chalk.gray(` - ${command}: ${count} uses`));
    }
  }
}
