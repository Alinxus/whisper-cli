#!/usr/bin/env python3
"""
Whisper CLI Python Package
==========================

A Python wrapper for Whisper AI - the AI-powered code security intelligence CLI.

This package provides easy access to Whisper CLI functionality from Python environments,
making it accessible to Python developers without requiring Node.js installation.
"""

import os
import sys
import platform
import urllib.request
import zipfile
import shutil
from pathlib import Path
from setuptools import setup, find_packages
from setuptools.command.install import install


class WhisperInstall(install):
    """Custom installation class to download and setup Whisper CLI binary."""
    
    def run(self):
        # Run normal installation first
        install.run(self)
        
        # Download and setup the appropriate binary
        self.download_whisper_binary()
    
    def download_whisper_binary(self):
        """Download the appropriate Whisper binary for the current platform."""
        system = platform.system().lower()
        machine = platform.machine().lower()
        
        # Determine the correct binary to download
        if system == 'windows':
            binary_name = 'whisper-win.exe'
            executable_name = 'whisper.exe'
        elif system == 'darwin':  # macOS
            binary_name = 'whisper-macos'
            executable_name = 'whisper'
        elif system == 'linux':
            binary_name = 'whisper-linux'
            executable_name = 'whisper'
        else:
            print(f"⚠️  Unsupported platform: {system}")
            print("Please install Node.js and use: npm install -g whisper-ai")
            return
        
        # Create whisper directory in site-packages
        install_dir = Path(self.install_lib) / 'whisper_cli' / 'bin'
        install_dir.mkdir(parents=True, exist_ok=True)
        
        binary_path = install_dir / executable_name
        
        print(f"📦 Downloading Whisper CLI binary for {system}...")
        
        try:
            # In a real scenario, you'd download from GitHub releases
            download_url = f"https://github.com/Alinxus/whisper-cli/releases/latest/download/{binary_name}"
            
            # For now, we'll copy from local build if available
            local_binary = Path(__file__).parent.parent / 'dist' / binary_name
            if local_binary.exists():
                shutil.copy2(local_binary, binary_path)
                print(f"✅ Copied local binary to {binary_path}")
            else:
                print(f"ℹ️  Local binary not found. You'll need to build it first with:")
                print(f"   npm run build:standalone")
                return
            
            # Make executable on Unix systems
            if system != 'windows':
                os.chmod(binary_path, 0o755)
            
            print(f"✅ Whisper CLI installed successfully!")
            print(f"🚀 You can now use: python -m whisper_cli --help")
            
        except Exception as e:
            print(f"❌ Failed to download Whisper binary: {e}")
            print("Please install manually or use Node.js version")


setup(
    name="whisper-cli",
    version="1.5.0",
    description="AI-powered code security intelligence CLI - Python wrapper",
    long_description=__doc__,
    long_description_content_type="text/plain",
    author="Whisper CLI Team",
    author_email="team@whisper",
    url="https://github.com/Alinxus/whisper-cli",
    project_urls={
        "Bug Reports": "https://github.com/Alinxus/whisper-cli/issues",
        "Documentation": "https://whisper-cli.dev",
        "Source": "https://github.com/Alinxus/whisper-cli",
    },
    packages=find_packages(),
    include_package_data=True,
    python_requires=">=3.7",
    install_requires=[
        "requests>=2.25.0",
        "click>=8.0.0",
        "colorama>=0.4.4",
    ],
    extras_require={
        "dev": ["pytest", "black", "flake8"],
    },
    entry_points={
        "console_scripts": [
            "whisper=whisper_cli.cli:main",
            "whisper-ai=whisper_cli.cli:main",
        ],
    },
    cmdclass={
        "install": WhisperInstall,
    },
    classifiers=[
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
        "Topic :: Software Development :: Quality Assurance",
        "Topic :: Security",
        "Topic :: Software Development :: Testing",
    ],
    keywords="cli ai security code-analysis code-review developer-tools static-analysis",
)
