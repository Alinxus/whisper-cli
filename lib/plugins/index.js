import path from 'path';
import chalk from 'chalk';
import fs from 'fs-extra';
import os from 'os';
import { exec } from 'child_process';
export class PluginManager {
  constructor() {
    this.pluginsPath = path.join(os.homedir(), '.whisper-cli', 'plugins');
    fs.ensureDirSync(this.pluginsPath);
  }

  async load() {
    const files = await fs.readdir(this.pluginsPath);
    for (const file of files) {
      const pluginPath = path.join(this.pluginsPath, file);
      try {
        const plugin = await import(pluginPath);
        if (plugin?.default?.register) {
          plugin.default.register();
          console.log(chalk.green(`✅ Plugin loaded: ${file}`));
        } else {
          console.log(chalk.yellow(`⚠️  Plugin missing register(): ${file}`));
        }
      } catch (err) {
        console.log(chalk.red(`❌ Failed to load plugin ${file}: ${err.message}`));
      }
    }
  }

  async install(plugin) {
    // Support: npm package, GitHub repo, local path
    console.log(chalk.blue(`📦 Installing plugin: ${plugin}`));
    try {
      const installPath = path.join(this.pluginsPath, path.basename(plugin));
      if (plugin.startsWith('http')) {
        // Remote plugin - clone or download
        console.log(chalk.gray('Remote plugin install not yet supported.'));
      } else if (fs.existsSync(plugin)) {
        // Local path
        await fs.copy(plugin, installPath);
      } else {
        // Fallback: treat as npm package
        await new Promise((resolve, reject) => {
          exec(`npm install ${plugin} --prefix ${this.pluginsPath}`, (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      }
      console.log(chalk.green(`✅ Plugin installed: ${plugin}`));
    } catch (err) {
      console.error(chalk.red(`❌ Plugin installation failed: ${err.message}`));
    }
  }

  async list() {
    const files = await fs.readdir(this.pluginsPath);
    if (!files.length) {
      console.log(chalk.gray('No plugins installed.'));
      return [];
    }
    console.log(chalk.cyan('🔌 Installed Plugins:'));
    for (const f of files) {
      console.log(chalk.gray(` - ${f}`));
    }
    return files;
  }

  async remove(plugin) {
    const pluginPath = path.join(this.pluginsPath, plugin);
    if (!fs.existsSync(pluginPath)) {
      console.log(chalk.red(`❌ Plugin not found: ${plugin}`));
      return;
    }
    await fs.remove(pluginPath);
    console.log(chalk.yellow(`🗑️  Plugin removed: ${plugin}`));
  }
}
