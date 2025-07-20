# Whisper CLI (Backendless, AI-Powered)

Whisper CLI is an open-source, AI-powered code security and code analysis tool for developers, teams, and security analysts. It works entirely standalone—no backend, no authentication, no analytics, and no rate limits. All you need are your own AI API keys!

## ✨ Features
- **AI-powered code scanning** for vulnerabilities and improvements
- **Explain code** with advanced AI models
- **Suggest and auto-fix issues** using AI
- **Pre-commit security guard** for Git
- **Works with OpenAI, Gemini, and Anthropic APIs**
- **No backend, no login, no tracking**

---

## 🚀 Installation

### 1. Install via npm (recommended)

```sh
npm install -g whisper-cli-ai
```

### 2. Or clone from GitHub (for open source contributors)

```sh
git clone https://github.com/yourusername/whisper.git
cd whisper
npm install
npm run build
npm link # (optional, to use as a global CLI)
```

---

## 🔑 Setup: Provide Your AI API Keys

1. Copy the example environment file:
   ```sh
   cp .env.example .env
   ```
2. Open `.env` and add your API keys for any of the following:
   - `GEMINI_API_KEY` (Google Gemini)
   - `OPENAI_API_KEY` (OpenAI)
   - `ANTHROPIC_API_KEY` (Anthropic Claude)

You only need to provide the keys for the AI providers you want to use.

---

## 📂 Using .whisperignore

You can create a `.whisperignore` file in your project root to exclude files and folders from being scanned by Whisper CLI. This works just like a `.gitignore` file.

- **Why?** To speed up scans and avoid analyzing files you don't care about (e.g., `node_modules`, build output, logs, etc).
- **How?** Add one pattern per line. Example:

```
node_modules/
dist/
build/
*.log
.env
.git/
coverage/
```

- **Default ignores:** Whisper CLI already ignores common folders like `node_modules`, `.git`, `dist`, etc. Your `.whisperignore` will be merged with these defaults.

---

## 🛠️ Usage

### Scan your code for vulnerabilities
```sh
whisper scan [path] [options]
```
- Example:
  ```sh
  whisper scan . --ai --model gpt-4o
  ```

### Explain a file or function
```sh
whisper explain <file> [options]
```
- Example:
  ```sh
  whisper explain src/index.js --model gemini-1.5-pro
  ```

### Suggest and auto-fix issues
```sh
whisper fix [path] [options]
```

### Use the AI chat mode
```sh
whisper chat [options]
```

### Add a Git pre-commit security guard
```sh
whisper guard --install
```

---

## 📋 Available Commands
- `scan`        — Scan code for vulnerabilities and improvements
- `explain`     — Explain code with AI
- `fix`         — Suggest and auto-fix issues
- `chat`        — Interactive AI chat mode
- `guard`       — Git pre-commit security guard
- `config`      — Manage CLI configuration
- `plugin`      — Manage CLI plugins
- `history`     — View local chat and scan history
- `update`      — Update the CLI
- `doctor`      — Diagnose and fix common issues

> **Note:** There are no `auth`, `analytics`, or backend commands. Everything runs locally and securely.

---

## 🧑‍💻 Open Source & Contributing

We welcome contributions! To get started:

1. Fork this repo and clone it locally.
2. Install dependencies: `npm install`
3. Make your changes and add tests if needed.
4. Open a pull request with a clear description.

### Development
- The CLI entry point is in `bin/whisper.js`.
- Main logic is in `lib/`.
- Backend code (in `backend/`) is provided as a template and is not required for CLI use.

---

## 🙋 FAQ

**Q: Do I need to sign up or log in?**
> No. Just provide your own AI API keys in `.env`.

**Q: Is my code sent to any backend?**
> No. All analysis is done locally and only sent to the AI APIs you configure.

**Q: Can I use this for commercial or team projects?**
> Yes! Just provide your own API keys and use it anywhere.

---

## 📣 License

MIT License. See [LICENSE](LICENSE) for details.

---

**Happy coding and stay secure!**
