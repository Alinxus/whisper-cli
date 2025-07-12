import path from 'path';
import chalk from 'chalk';
import { existsSync, readdirSync, mkdirSync, copyFileSync, rmSync } from 'fs';
import os from 'os';
import { exec } from 'child_process';
export class PluginManager {
  constructor() {
    this.pluginsPath = path.join(os.homedir(), '.whisper-cli', 'plugins');
    if (!existsSync(this.pluginsPath)) {
      mkdirSync(this.pluginsPath, { recursive: true });
    }
  }

  async load() {
    try {
      if (!existsSync(this.pluginsPath)) {
        return; // No plugins directory, nothing to load
      }
      
      const files = readdirSync(this.pluginsPath);
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
    } catch (err) {
      // Silent fail for plugin loading
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
      } else if (existsSync(plugin)) {
        // Local path
        copyFileSync(plugin, installPath);
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
    try {
      if (!existsSync(this.pluginsPath)) {
        console.log(chalk.gray('No plugins installed.'));
        return [];
      }
      
      const files = readdirSync(this.pluginsPath);
      if (!files.length) {
        console.log(chalk.gray('No plugins installed.'));
        return [];
      }
      console.log(chalk.cyan('🔌 Installed Plugins:'));
      for (const f of files) {
        console.log(chalk.gray(` - ${f}`));
      }
      return files;
    } catch (err) {
      console.log(chalk.gray('No plugins installed.'));
      return [];
    }
  }

  async remove(plugin) {
    const pluginPath = path.join(this.pluginsPath, plugin);
    if (!existsSync(pluginPath)) {
      console.log(chalk.red(`❌ Plugin not found: ${plugin}`));
      return;
    }
    rmSync(pluginPath, { recursive: true, force: true });
    console.log(chalk.yellow(`🗑️  Plugin removed: ${plugin}`));
  }
}
