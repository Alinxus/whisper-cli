#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const rootDir = path.resolve(__dirname, '..');
const wrapperDir = path.join(rootDir, 'python-wrapper');

console.log(chalk.cyan('🐍 Building Python wrapper for Whisper CLI...\n'));

try {
  // Ensure the wrapper directory exists
  if (!fs.existsSync(wrapperDir)) {
    console.error(chalk.red('❌ Python wrapper directory not found!'));
    process.exit(1);
  }

  // Copy README to wrapper directory
  const mainReadme = path.join(rootDir, 'README.md');
  const wrapperReadme = path.join(wrapperDir, 'README.md');
  
  if (fs.existsSync(mainReadme)) {
    let readmeContent = fs.readFileSync(mainReadme, 'utf8');
    
    // Modify README for Python package
    readmeContent = readmeContent.replace(
      /npm install -g whisper-ai/g,
      'pip install whisper-ai-cli'
    );
    readmeContent = readmeContent.replace(
      /whisper scan/g,
      'whisper scan  # or python -m whisper_cli scan'
    );
    
    fs.writeFileSync(wrapperReadme, readmeContent);
    console.log(chalk.green('✅ Copied and adapted README.md'));
  }

  // Create requirements.txt for development
  const requirements = `requests>=2.25.0
click>=8.0.0
colorama>=0.4.4
pytest>=6.0.0
black>=21.0.0
flake8>=3.8.0
wheel>=0.36.0
setuptools>=50.0.0
twine>=3.0.0
`;
  
  fs.writeFileSync(path.join(wrapperDir, 'requirements.txt'), requirements);
  console.log(chalk.green('✅ Created requirements.txt'));

  // Create pyproject.toml for modern Python packaging
  const pyprojectToml = `[build-system]
requires = ["setuptools>=50", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "whisper-ai-cli"
version = "1.5.0"
description = "AI-powered code security intelligence CLI - Python wrapper"
readme = "README.md"
license = {file = "LICENSE"}
authors = [{name = "Whisper CLI Team", email = "team@whisper-cli.dev"}]
classifiers = [
    "Development Status :: 4 - Beta",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Operating System :: OS Independent",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.7",
    "Programming Language :: Python :: 3.8",
    "Programming Language :: Python :: 3.9",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
]
keywords = ["cli", "ai", "security", "code-analysis", "code-review"]
requires-python = ">=3.7"
dependencies = [
    "requests>=2.25.0",
    "click>=8.0.0",
    "colorama>=0.4.4",
]

[project.optional-dependencies]
dev = ["pytest", "black", "flake8"]

[project.urls]
Homepage = "https://whisper-cli.dev"
Documentation = "https://whisper-cli.dev"
Repository = "https://github.com/Alinxus/whisper-cli"
"Bug Reports" = "https://github.com/Alinxus/whisper-cli/issues"

[project.scripts]
whisper = "whisper_cli.cli:main"
whisper-ai = "whisper_cli.cli:main"

[tool.setuptools.packages.find]
where = ["."]
include = ["whisper_cli*"]

[tool.setuptools.package-data]
whisper_cli = ["bin/*"]
`;

  fs.writeFileSync(path.join(wrapperDir, 'pyproject.toml'), pyprojectToml);
  console.log(chalk.green('✅ Created pyproject.toml'));

  // Create MANIFEST.in to include binaries
  const manifest = `include README.md
include LICENSE
include requirements.txt
recursive-include whisper_cli/bin *
`;
  
  fs.writeFileSync(path.join(wrapperDir, 'MANIFEST.in'), manifest);
  console.log(chalk.green('✅ Created MANIFEST.in'));

  // Copy LICENSE
  const mainLicense = path.join(rootDir, 'LICENSE');
  const wrapperLicense = path.join(wrapperDir, 'LICENSE');
  
  if (fs.existsSync(mainLicense)) {
    fs.copyFileSync(mainLicense, wrapperLicense);
    console.log(chalk.green('✅ Copied LICENSE'));
  } else {
    // Create a basic MIT license if none exists
    const mitLicense = `MIT License

Copyright (c) 2024 Whisper CLI Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
    fs.writeFileSync(wrapperLicense, mitLicense);
    console.log(chalk.green('✅ Created LICENSE'));
  }

  console.log(chalk.green('\n🎉 Python wrapper build completed successfully!'));
  console.log(chalk.yellow('\n📋 Next steps:'));
  console.log(chalk.gray('  1. Build standalone binaries: npm run build:standalone'));
  console.log(chalk.gray('  2. Test Python package: cd python-wrapper && pip install -e .'));
  console.log(chalk.gray('  3. Publish to PyPI: cd python-wrapper && python -m twine upload dist/*'));

} catch (error) {
  console.error(chalk.red(`❌ Error building Python wrapper: ${error.message}`));
  process.exit(1);
}
