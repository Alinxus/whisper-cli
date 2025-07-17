import * as React from "react";
import Link from "next/link";
import { BookOpenIcon, CommandLineIcon, Cog6ToothIcon, RocketLaunchIcon, LightBulbIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

const sections = [
  { id: "getting-started", title: "Getting Started" },
  { id: "cli-commands", title: "CLI Commands" },
  { id: "self-hosting", title: "Self-Hosting" },
  { id: "advanced-guides", title: "Advanced Guides" },
  { id: "how-it-works", title: "How It Works" },
  { id: "faq", title: "FAQ" },
];

// Add type for sectionIcons to allow string indexing
const sectionIcons: Record<string, React.JSX.Element> = {
  'getting-started': <RocketLaunchIcon className="inline w-7 h-7 mr-2 text-indigo-400 align-middle" />, 
  'cli-commands': <CommandLineIcon className="inline w-7 h-7 mr-2 text-indigo-400 align-middle" />, 
  'self-hosting': <Cog6ToothIcon className="inline w-7 h-7 mr-2 text-indigo-400 align-middle" />, 
  'advanced-guides': <LightBulbIcon className="inline w-7 h-7 mr-2 text-indigo-400 align-middle" />, 
  'how-it-works': <BookOpenIcon className="inline w-7 h-7 mr-2 text-indigo-400 align-middle" />, 
  'faq': <QuestionMarkCircleIcon className="inline w-7 h-7 mr-2 text-indigo-400 align-middle" />
};

// Add AnimatedLines component for subtle animated SVG lines
function AnimatedLines() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" aria-hidden="true">
      <g className="animate-move-lines">
        <polyline points="0,100 100,200 300,100 500,200 700,100" fill="none" stroke="#6366f1" strokeWidth="2" opacity="0.12">
          <animate attributeName="points" values="0,100 100,200 300,100 500,200 700,100;0,120 100,180 300,120 500,180 700,120;0,100 100,200 300,100 500,200 700,100" dur="8s" repeatCount="indefinite" />
        </polyline>
        <polyline points="0,300 200,400 400,300 600,400 800,300" fill="none" stroke="#818cf8" strokeWidth="2" opacity="0.10">
          <animate attributeName="points" values="0,300 200,400 400,300 600,400 800,300;0,320 200,380 400,320 600,380 800,320;0,300 200,400 400,300 600,400 800,300" dur="10s" repeatCount="indefinite" />
        </polyline>
      </g>
      <style>{`
        .animate-move-lines polyline {
          filter: blur(0.5px);
        }
      `}</style>
    </svg>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#312e81] text-white flex flex-col overflow-x-hidden relative">
      <AnimatedLines />
      {/* Hero */}
      <section className="pt-20 pb-10 px-4 md:px-0 text-center border-b border-indigo-900/40 bg-black/60 backdrop-blur">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 leading-tight text-indigo-300">Whisper Docs</h1>
          <p className="text-lg md:text-2xl text-gray-200 mb-4">
            Everything you need to know to get started, use, and master Whisper — the AI Security Cop for your codebase.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <Link href="/" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded shadow">Back to Home</Link>
            <a href="https://www.npmjs.com/package/whisper-ai" target="_blank" className="bg-gray-900 hover:bg-gray-800 text-indigo-200 font-semibold px-6 py-2 rounded shadow border border-gray-700">npm install -g whisper-ai</a>
            <a href="https://github.com/Alinxus/whisper-cli" target="_blank" className="bg-gray-900 hover:bg-gray-800 text-indigo-200 font-semibold px-6 py-2 rounded shadow border border-gray-700">GitHub</a>
            <a href="https://x.com/alameenpd" target="_blank" className="bg-gray-900 hover:bg-gray-800 text-indigo-200 font-semibold px-6 py-2 rounded shadow border border-gray-700">Twitter</a>
          </div>
        </div>
      </section>
      <div className="flex flex-1 w-full max-w-6xl mx-auto px-4 py-10 gap-10 overflow-x-hidden">
        {/* Sidebar */}
        <nav className="sticky top-28 space-y-2 min-w-[220px] max-w-[220px] hidden md:block">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={
                `block px-4 py-2 rounded text-lg font-medium transition font-semibold ` +
                `text-indigo-200 hover:bg-indigo-900/30 hover:text-white sidebar-link`
              }
              data-section={s.id}
            >
              {sectionIcons[s.id as keyof typeof sectionIcons]}{s.title}
            </a>
          ))}
        </nav>
        {/* Main Content */}
        <main className="flex-1 space-y-24 max-w-full overflow-x-auto">
          {/* Getting Started */}
          <section id="getting-started" className="scroll-mt-24 group">
            <div className="flex items-center gap-2 mb-2">
              {sectionIcons['getting-started']}
              <h2 className="text-3xl font-bold text-indigo-300 inline">Getting Started</h2>
            </div>
            <div className="h-1 w-16 bg-indigo-700 rounded mb-6 group-hover:w-24 transition-all" />
            <ul className="mb-4 text-lg text-gray-200 list-disc list-inside space-y-2">
              <li><b>Prerequisites:</b> Node.js 18+ and npm installed. (Check with <span className="font-mono">node -v</span> and <span className="font-mono">npm -v</span>)</li>
              <li>Optional: <b>Git</b> for version control, <b>Docker</b> for self-hosting.</li>
            </ul>
            <p className="mb-2 text-gray-300">Install Whisper globally with npm:</p>
            <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-lg mb-4 overflow-x-auto">npm install -g whisper-ai</pre>
            <p className="mb-2 text-gray-300">Or run it instantly with npx:</p>
            <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-lg mb-4 overflow-x-auto">npx whisper-ai scan .</pre>
            <p className="mb-2 text-gray-300">After install, try:</p>
            <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-lg mb-4 overflow-x-auto">whisper scan .</pre>
            <h3 className="text-xl font-semibold mt-8 mb-2 text-indigo-200">Troubleshooting</h3>
            <ul className="text-gray-300 list-disc list-inside space-y-1">
              <li>If <span className="font-mono">whisper</span> is not found, try restarting your terminal or ensure <span className="font-mono">npm</span> global bin is in your <span className="font-mono">$PATH</span>.</li>
              <li>For permission errors, use <span className="font-mono">sudo npm install -g whisper-ai</span> (Linux/Mac).</li>
              <li>On Windows, run your terminal as Administrator.</li>
            </ul>
          </section>

          {/* CLI Commands */}
          <section id="cli-commands" className="scroll-mt-24 group">
            <div className="flex items-center gap-2 mb-2">
              {sectionIcons['cli-commands']}
              <h2 className="text-3xl font-bold text-indigo-300 inline">CLI Commands</h2>
            </div>
            <div className="h-1 w-16 bg-indigo-700 rounded mb-6 group-hover:w-24 transition-all" />
            <div className="space-y-10">
              {/* SCAN */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">whisper scan [path]</h3>
                <p className="text-gray-300 mb-2">Scan your codebase for vulnerabilities. Supports AI-powered analysis and multiple output formats.</p>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">whisper scan .
whisper scan ./src --ai --format html --output report.html</pre>
                <ul className="text-gray-300 list-disc list-inside space-y-1 mb-2">
                  <li><b>--ai</b>: Enable AI-powered analysis (default: true)</li>
                  <li><b>--format</b>: Output format (markdown, html, json, csv)</li>
                  <li><b>--output</b>: Output file path</li>
                  <li><b>--fix</b>: Attempt to auto-fix issues (see <b>whisper fix</b>)</li>
                  <li><b>--ignore</b>: Ignore patterns (comma-separated)</li>
                  <li><b>--include</b>: Include patterns (comma-separated)</li>
                  <li><b>--max-files</b>: Maximum files to scan</li>
                  <li><b>--model</b>: AI model to use (gemini, openai, claude)</li>
                  <li><b>--severity</b>: Minimum severity level (low, medium, high, critical)</li>
                </ul>
                <p className="text-gray-400 text-sm">See <Link href="#how-it-works" className="underline hover:text-indigo-300">How It Works</Link> for more details.</p>
              </div>
              {/* FIX */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">whisper fix [path]</h3>
                <p className="text-gray-300 mb-2">Get AI-powered fix suggestions for issues found in your last scan. Interactive mode supported.</p>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">whisper fix . --interactive --severity high</pre>
                <ul className="text-gray-300 list-disc list-inside space-y-1 mb-2">
                  <li><b>--interactive</b>: Interactive mode for applying fixes</li>
                  <li><b>--severity</b>: Minimum severity level to fix</li>
                  <li><b>--model</b>: AI model to use</li>
                </ul>
              </div>
              {/* EXPLAIN */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">whisper explain &lt;file&gt;</h3>
                <p className="text-gray-300 mb-2">Explain code or security risks in a file or function.</p>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">whisper explain src/app.js --line 42
whisper explain src/utils.js --function loginUser</pre>
                <ul className="text-gray-300 list-disc list-inside space-y-1 mb-2">
                  <li><b>--line</b>: Specific line number to explain</li>
                  <li><b>--function</b>: Function name to explain</li>
                  <li><b>--security</b>: Focus on security aspects</li>
                  <li><b>--model</b>: AI model to use</li>
                </ul>
              </div>
              {/* TEAM */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">whisper team [subcommand]</h3>
                <p className="text-gray-300 mb-2">Team and organization management. (Requires team plan)</p>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">whisper team sync --project my-app --org my-org
whisper team invite user@email.com --role admin</pre>
                <ul className="text-gray-300 list-disc list-inside space-y-1 mb-2">
                  <li><b>sync</b>: Sync with team dashboard</li>
                  <li><b>invite</b>: Invite team member</li>
                  <li><b>--role</b>: Team role (admin, member, viewer)</li>
                </ul>
              </div>
              {/* CONFIG */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">whisper config [get|set|list]</h3>
                <p className="text-gray-300 mb-2">Manage CLI configuration (API key, model, etc).</p>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">whisper config get apiKey
whisper config set apiKey my-key
whisper config list</pre>
              </div>
              {/* ANALYTICS */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">whisper analytics usage</h3>
                <p className="text-gray-300 mb-2">Show usage statistics (Pro/Team plans).</p>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">whisper analytics usage --period week</pre>
              </div>
              {/* CHAT */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">whisper chat</h3>
                <p className="text-gray-300 mb-2">Interactive AI chat mode for code security questions.</p>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">whisper chat --model gemini --context ./src</pre>
              </div>
              {/* GUARD */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">whisper guard</h3>
                <p className="text-gray-300 mb-2">Git pre-commit security guard. Blocks risky commits based on scan results.</p>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">whisper guard --install
whisper guard --uninstall --severity high</pre>
                <ul className="text-gray-300 list-disc list-inside space-y-1 mb-2">
                  <li><b>--install</b>: Install pre-commit hook</li>
                  <li><b>--uninstall</b>: Uninstall pre-commit hook</li>
                  <li><b>--severity</b>: Block commits with issues above this level</li>
                </ul>
              </div>
              {/* PLUGIN */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">whisper plugin [install|list|remove]</h3>
                <p className="text-gray-300 mb-2">Plugin management. Extend Whisper with custom plugins.</p>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">whisper plugin install my-plugin
whisper plugin list
whisper plugin remove my-plugin</pre>
              </div>
              {/* HISTORY */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">whisper history</h3>
                <p className="text-gray-300 mb-2">View chat and scan history.</p>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">whisper history --chat
whisper history --scans
whisper history --clear</pre>
              </div>
              {/* DOCTOR */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">whisper doctor</h3>
                <p className="text-gray-300 mb-2">Diagnose and fix common issues.</p>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">whisper doctor</pre>
              </div>
            </div>
          </section>

          {/* Self-Hosting */}
          <section id="self-hosting" className="scroll-mt-24 group">
            <div className="flex items-center gap-2 mb-2">
              {sectionIcons['self-hosting']}
              <h2 className="text-3xl font-bold text-indigo-300 inline">Self-Hosting</h2>
            </div>
            <div className="h-1 w-16 bg-indigo-700 rounded mb-6 group-hover:w-24 transition-all" />
            <p className="mb-4 text-lg text-gray-200">Whisper is open source and can be self-hosted for full control and privacy.</p>
            <ol className="list-decimal list-inside space-y-3 text-lg text-gray-200 mb-6">
              <li>
                <span className="font-semibold text-indigo-200">Clone the repo:</span>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">git clone https://github.com/your-org/whisper.git
cd whisper</pre>
              </li>
              <li>
                <span className="font-semibold text-indigo-200">Install dependencies:</span>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">pnpm install</pre>
              </li>
              <li>
                <span className="font-semibold text-indigo-200">Set up environment variables:</span>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">cp .env.example .env
# Edit .env with your DB, API keys, etc.</pre>
              </li>
              <li>
                <span className="font-semibold text-indigo-200">Set up the database:</span>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">pnpm run db:migrate</pre>
              </li>
              <li>
                <span className="font-semibold text-indigo-200">Run locally:</span>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">pnpm dev</pre>
              </li>
              <li>
                <span className="font-semibold text-indigo-200">(Optional) Run with Docker:</span>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-base mb-2 overflow-x-auto">docker compose up --build</pre>
              </li>
            </ol>
            <p className="text-gray-300">See <a href="https://github.com/your-org/whisper" target="_blank" className="underline hover:text-indigo-300">GitHub</a> for advanced configuration, environment variables, and deployment guides.</p>
          </section>

          {/* Advanced Guides */}
          <section id="advanced-guides" className="scroll-mt-24 group">
            <div className="flex items-center gap-2 mb-2">
              {sectionIcons['advanced-guides']}
              <h2 className="text-3xl font-bold text-indigo-300 inline">Advanced Guides</h2>
            </div>
            <div className="h-1 w-16 bg-indigo-700 rounded mb-6 group-hover:w-24 transition-all" />
            <div className="space-y-10">
              {/* CI/CD Integration */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">CI/CD Integration</h3>
                <p className="text-gray-300 mb-2">Automate security scans in your pipelines.</p>
                <div className="mb-2">
                  <b className="text-indigo-200">GitHub Actions Example:</b>
                  <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-sm mb-2 overflow-x-auto">name: Whisper Security Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install -g whisper-ai
      - run: whisper scan . --format html --output report.html
</pre>
                </div>
                <div className="mb-2">
                  <b className="text-indigo-200">GitLab CI Example:</b>
                  <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-sm mb-2 overflow-x-auto">whisper_scan:
  image: node:18
  script:
    - npm install -g whisper-ai
    - whisper scan . --format markdown --output scan.md
  only:
    - merge_requests
    - main
</pre>
                </div>
              </div>
              {/* Custom AI Model Config */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">Custom AI Model Configuration</h3>
                <p className="text-gray-300 mb-2">You can specify which AI model to use for analysis and fixes:</p>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-sm mb-2 overflow-x-auto">whisper scan . --model gemini
whisper fix . --model openai
</pre>
                <p className="text-gray-400 text-sm">Supported models: <b>gemini</b>, <b>openai</b>, <b>claude</b> (see <Link href="#faq" className="underline hover:text-indigo-300">FAQ</Link> for more).</p>
              </div>
              {/* Writing Plugins */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">Writing Plugins</h3>
                <p className="text-gray-300 mb-2">Extend Whisper with custom plugins for new rules, integrations, or workflows.</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-200 mb-2">
                  <li>Create a new JS file in <span className="font-mono">lib/plugins/</span>.</li>
                  <li>Export a function that receives the scan context and findings.</li>
                  <li>Register your plugin in <span className="font-mono">lib/plugins/index.js</span>.</li>
                </ol>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-sm mb-2 overflow-x-auto">{`// my-plugin.js
module.exports = function(context, findings) {
  // Custom logic here
  return findings;
};`}</pre>
                <p className="text-gray-400 text-sm">See <a href="https://github.com/your-org/whisper/tree/main/lib/plugins" target="_blank" className="underline hover:text-indigo-300">plugin examples</a> on GitHub.</p>
              </div>
              {/* Advanced CLI Usage */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">Advanced CLI Usage</h3>
                <p className="text-gray-300 mb-2">Chain commands, use in scripts, or automate with shell tools:</p>
                <pre className="bg-gray-900 rounded p-4 text-indigo-200 font-mono text-sm mb-2 overflow-x-auto">{`# Scan and auto-fix in one line
whisper scan . && whisper fix .

# Save output and email report
whisper scan . --format html --output report.html && mail -s "Scan Report" you@email.com < report.html`}</pre>
              </div>
              {/* Security Best Practices */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">Security Best Practices</h3>
                <ul className="text-gray-300 list-disc list-inside space-y-1 mb-2">
                  <li>Keep Whisper and dependencies up to date.</li>
                  <li>Review AI-generated fixes before applying in production.</li>
                  <li>Use <span className="font-mono">whisper guard</span> to block risky commits.</li>
                  <li>Integrate scans into CI/CD for every PR.</li>
                  <li>Limit API key exposure and rotate keys regularly.</li>
                </ul>
              </div>
              {/* Troubleshooting Advanced Issues */}
              <div>
                <h3 className="text-2xl font-semibold text-indigo-200 mb-2">Troubleshooting Advanced Issues</h3>
                <ul className="text-gray-300 list-disc list-inside space-y-1 mb-2">
                  <li>For memory or timeout errors, increase Node.js memory: <span className="font-mono">NODE_OPTIONS=--max-old-space-size=4096 whisper scan .</span></li>
                  <li>Check logs in <span className="font-mono">~/.whisper/logs</span> for debugging.</li>
                  <li>For plugin errors, disable plugins with <span className="font-mono">--no-plugins</span>.</li>
                  <li>Open an issue on GitHub with logs and steps to reproduce.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section id="how-it-works" className="scroll-mt-24 group">
            <div className="flex items-center gap-2 mb-2">
              {sectionIcons['how-it-works']}
              <h2 className="text-3xl font-bold text-indigo-300 inline">How It Works</h2>
            </div>
            <div className="h-1 w-16 bg-indigo-700 rounded mb-6 group-hover:w-24 transition-all" />
            <ol className="list-decimal list-inside space-y-3 text-lg text-gray-200">
              <li><span className="font-semibold text-indigo-200">Install:</span> Whisper is a Node.js CLI. Install globally with npm or use npx for one-off runs.</li>
              <li><span className="font-semibold text-indigo-200">Scan:</span> Run <span className="font-mono">whisper scan .</span> in your project directory. Whisper analyzes your code for vulnerabilities using advanced AI models.</li>
              <li><span className="font-semibold text-indigo-200">Review:</span> Get a clear, actionable report in your terminal or dashboard.</li>
              <li><span className="font-semibold text-indigo-200">Fix:</span> Use <span className="font-mono">whisper fix .</span> to get AI-powered suggestions or auto-fixes for issues found.</li>
              <li><span className="font-semibold text-indigo-200">Collaborate:</span> Share results, manage projects, and sync with your team using the dashboard or CLI team commands.</li>
            </ol>
          </section>

          {/* FAQ */}
          <section id="faq" className="scroll-mt-24 group">
            <div className="flex items-center gap-2 mb-2">
              {sectionIcons['faq']}
              <h2 className="text-3xl font-bold text-indigo-300 inline">FAQ</h2>
            </div>
            <div className="h-1 w-16 bg-indigo-700 rounded mb-6 group-hover:w-24 transition-all" />
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg text-indigo-200 mb-1">Is Whisper open source?</h3>
                <p className="text-gray-300">Yes! Whisper is open source and available on <a href="https://github.com/Alinxus/whisper-cli" target="_blank" className="underline hover:text-indigo-300">GitHub</a>.</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-indigo-200 mb-1">Do I need Node.js installed?</h3>
                <p className="text-gray-300">Yes, Whisper is a Node.js CLI. You need Node.js 18+ installed to use it.</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-indigo-200 mb-1">Can I use Whisper in CI/CD?</h3>
                <p className="text-gray-300">Absolutely! Whisper is designed for automation and can be integrated into any CI/CD pipeline.</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-indigo-200 mb-1">How do I get support?</h3>
                <p className="text-gray-300">Open an issue on GitHub or reach out via <a href="mailto:support@whisper-cli.dev" className="underline hover:text-indigo-300">email</a>.</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-indigo-200 mb-1">How do I self-host Whisper?</h3>
                <p className="text-gray-300">See the <a href="#self-hosting" className="underline hover:text-indigo-300">Self-Hosting</a> section above for step-by-step instructions.</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-indigo-200 mb-1">Can I contribute?</h3>
                <p className="text-gray-300">Yes! Contributions are welcome. Fork the repo, open a PR, or suggest features via GitHub Issues.</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-indigo-200 mb-1">Does Whisper support plugins?</h3>
                <p className="text-gray-300">Yes, you can install, list, and remove plugins using the <span className="font-mono">whisper plugin</span> command.</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-indigo-200 mb-1">Where can I find more examples?</h3>
                <p className="text-gray-300">Check the <a href="https://github.com/your-org/whisper/tree/main/examples" target="_blank" className="underline hover:text-indigo-300">examples</a> directory on GitHub for more usage patterns.</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
} 