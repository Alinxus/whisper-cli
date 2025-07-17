'use client'
import Link from "next/link";
import { useState, useEffect } from "react";

const features = [
  { title: "AI-Powered Scanning", desc: "Detect vulnerabilities and code smells instantly with state-of-the-art AI models.", icon: "🤖" },
  { title: "Instant Fix Suggestions", desc: "Get actionable, AI-generated fixes for every issue found.", icon: "⚡" },
  { title: "Explain Code & Risks", desc: "Let Whisper explain complex code and security risks in plain English.", icon: "💡" },
  { title: "Team Collaboration", desc: "Share results, manage projects, and collaborate securely.", icon: "👥" },
  { title: "Seamless CI/CD Integration", desc: "Automate security in your pipeline with a single command.", icon: "🔗" },
  { title: "Plugin Support", desc: "Extend Whisper with plugins for custom rules and workflows.", icon: "🧩" },
];

const howItWorks = [
  { step: 1, title: "Install", desc: "npm install -g whisper-ai", code: "npm install -g whisper-ai" },
  { step: 2, title: "Scan", desc: "Run a scan in any project directory.", code: "whisper scan ." },
  { step: 3, title: "Review & Fix", desc: "Get instant, actionable results and AI-powered fixes.", code: "whisper fix ." },
  { step: 4, title: "Collaborate", desc: "Share results with your team or integrate into CI/CD.", code: "whisper team sync" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="ml-2 px-3 py-1 bg-gray-900 text-white rounded hover:bg-gray-800 text-sm border border-gray-700"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// Animated CLI demo lines
const cliLines = [
  { text: "$ whisper scan .", color: "text-green-400" },
  { text: "✔️  Scanning your project...", color: "text-gray-300" },
  { text: "⚠️  2 vulnerabilities found", color: "text-yellow-400" },
  { text: "💡  Try whisper fix . for instant AI-powered fixes", color: "text-blue-400" },
];

function AnimatedTerminal() {
  const [line, setLine] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setLine((l) => (l + 1) % (cliLines.length + 2)), 1200);
    const cursor = setInterval(() => setShowCursor((c) => !c), 500);
    return () => { clearInterval(t); clearInterval(cursor); };
  }, []);
  return (
    <div className="relative bg-black/80 rounded-lg p-4 border-2 border-indigo-600 text-left font-mono text-base max-w-xl mx-auto min-h-[140px] overflow-hidden shadow-2xl">
      {/* SVG terminal top bar */}
      <svg width="100%" height="24" className="absolute left-0 top-0" style={{zIndex:2}}>
        <rect x="0" y="0" width="100%" height="24" rx="8" fill="#18181b" />
        <circle cx="20" cy="12" r="5" fill="#ef4444" />
        <circle cx="40" cy="12" r="5" fill="#f59e42" />
        <circle cx="60" cy="12" r="5" fill="#22c55e" />
      </svg>
      <div className="pt-7 space-y-1 relative z-10">
        {cliLines.map((l, i) => (
          <div key={i} className={l.color + (line >= i ? " animate-fade-in" : " opacity-0")}>{l.text}{line === i && showCursor && <span className="inline-block w-2 h-5 bg-indigo-400 align-middle animate-blink ml-1" />}</div>
        ))}
      </div>
      <style jsx>{`
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0;} }
        .animate-blink { animation: blink 1s step-end infinite; }
      `}</style>
    </div>
  );
}

// SVG background pattern
function BgPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" aria-hidden="true">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#312e81" strokeWidth="1" />
        </pattern>
        <radialGradient id="fade" cx="50%" cy="50%" r="80%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      <rect width="100%" height="100%" fill="url(#fade)" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#312e81] text-white flex flex-col relative overflow-x-hidden">
      <BgPattern />
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 w-full bg-black/60 backdrop-blur border-b border-indigo-900/40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold text-indigo-400 tracking-tight">Whisper</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-base font-medium">
            <Link href="/" className="hover:text-indigo-300 transition">Home</Link>
            <a href="#pricing" className="hover:text-indigo-300 transition">Pricing</a>
            <Link href="/docs" className="hover:text-indigo-300 transition">Docs</Link>
            <a href="/dashboard" className="hover:text-indigo-300 transition">Dashboard</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-gray-300 hover:text-indigo-300 transition">Sign In</Link>
            <Link href="/auth/signup" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded shadow">Get Started</Link>
          </div>
        </div>
      </nav>
      {/* Hero */}
      <section className="pt-24 pb-16 px-4 md:px-0 flex flex-col items-center text-center relative z-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight animate-fade-in">
            Meet Whisper
            <span className="block text-indigo-400">Your AI Security Cop</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 mb-8 animate-fade-in delay-100">
            Scan, fix, and secure your codebase in seconds — right from your terminal.<br />
            <span className="text-indigo-300 font-semibold">npm install -g whisper-ai</span>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6 animate-fade-in delay-200">
            <div className="flex items-center bg-gray-800 rounded px-4 py-2 text-lg font-mono border border-gray-700">
              <span>npm install -g whisper-ai</span>
              <CopyButton text="npm install -g whisper-ai" />
            </div>
            <Link href="/docs" className="bg-indigo-700 hover:bg-indigo-800 text-white font-semibold px-6 py-3 rounded shadow mt-2 sm:mt-0">Read the Docs</Link>
          </div>
          <div className="mt-8 animate-fade-in delay-300">
            <AnimatedTerminal />
          </div>
          <div className="mt-4 text-sm text-gray-400 animate-fade-in delay-400">Available on <a href="https://www.npmjs.com/package/whisper-ai" target="_blank" className="underline hover:text-indigo-300">npm</a> — <span className="font-mono">npx whisper-ai</span></div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-br from-[#312e81]/60 to-[#0f172a]/80 relative z-10">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {howItWorks.map((step) => (
              <div key={step.step} className="bg-gray-900 rounded-xl p-8 border-2 border-indigo-700 flex flex-col items-center shadow-lg hover:scale-105 transition-transform duration-200">
                <div className="text-3xl font-bold mb-2 text-indigo-400">{step.step}</div>
                <div className="font-semibold text-lg mb-2">{step.title}</div>
                <div className="text-gray-300 mb-2 text-center">{step.desc}</div>
                <div className="bg-gray-800 px-3 py-1 rounded font-mono text-sm text-indigo-200">{step.code}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center">Why Whisper is the Better Cop</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {features.map((f, i) => (
              <div key={i} className="bg-gray-900 rounded-xl p-10 border-2 border-indigo-700 flex flex-col items-center text-center shadow-lg hover:scale-105 transition-transform duration-200">
                <div className="text-4xl mb-4 animate-bounce-slow">{f.icon}</div>
                <div className="font-semibold text-lg mb-2">{f.title}</div>
                <div className="text-gray-300">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-gradient-to-br from-[#312e81]/60 to-[#0f172a]/80 relative z-10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-2xl md:text-3xl font-semibold mb-6 text-indigo-200">Trusted by thousands of developers</div>
          <div className="flex flex-wrap justify-center gap-8 opacity-80">
            <div className="bg-gray-800 rounded px-8 py-4 text-gray-300 text-lg font-semibold">@yourcompany</div>
            <div className="bg-gray-800 rounded px-8 py-4 text-gray-300 text-lg font-semibold">@opensource</div>
            <div className="bg-gray-800 rounded px-8 py-4 text-gray-300 text-lg font-semibold">@securityweekly</div>
            <div className="bg-gray-800 rounded px-8 py-4 text-gray-300 text-lg font-semibold">@devs</div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 relative z-10">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-10">Simple, Transparent Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-900 border-2 border-indigo-700 rounded-xl p-8 flex flex-col items-center shadow-lg">
              <div className="text-2xl font-bold mb-2 text-indigo-400">Free</div>
              <div className="text-4xl font-extrabold mb-4">$0</div>
              <ul className="text-gray-300 mb-6 space-y-2 text-left">
                <li>✔️ 10 scans/month</li>
                <li>✔️ 1 repository</li>
                <li>✔️ Basic security scanning</li>
                <li>✔️ Markdown/HTML reports</li>
              </ul>
              <Link href="/auth/signup" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded shadow">Get Started</Link>
            </div>
            <div className="bg-gradient-to-br from-indigo-700 to-indigo-500 border-2 border-indigo-700 rounded-xl p-8 flex flex-col items-center shadow-xl scale-105">
              <div className="text-2xl font-bold mb-2 text-white">Pro</div>
              <div className="text-4xl font-extrabold mb-4 text-white">$15<span className="text-lg font-normal">/mo</span></div>
              <ul className="text-indigo-100 mb-6 space-y-2 text-left">
                <li>✔️ 300 scans/month</li>
                <li>✔️ AI-powered code fixes</li>
                <li>✔️ Up to 20 private repos</li>
                <li>✔️ CLI Auth Guard</li>
                <li>✔️ Team config sync</li>
                <li>✔️ Priority support</li>
              </ul>
              <Link href="/auth/signup" className="bg-white text-indigo-700 font-semibold px-6 py-2 rounded shadow">Start Pro</Link>
            </div>
            <div className="bg-gray-900 border-2 border-indigo-700 rounded-xl p-8 flex flex-col items-center shadow-lg">
              <div className="text-2xl font-bold mb-2 text-indigo-400">Team</div>
              <div className="text-4xl font-extrabold mb-4">$25<span className="text-lg font-normal">/user/mo</span></div>
              <ul className="text-gray-300 mb-6 space-y-2 text-left">
                <li>✔️ 1,000 scans/month (shared)</li>
                <li>✔️ All Pro features</li>
                <li>✔️ Shared team dashboard</li>
                <li>✔️ CI/CD integration</li>
                <li>✔️ Usage analytics</li>
                <li>✔️ Priority support</li>
              </ul>
              <Link href="/auth/signup" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded shadow">Start Team</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-10 border-t border-white/10 mt-auto relative z-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-white">Whisper</span>
            <a href="https://www.npmjs.com/package/whisper-ai" target="_blank" rel="noopener" className="bg-gray-800 px-3 py-1 rounded text-sm font-mono text-indigo-200 ml-2">npm</a>
            <a href="https://github.com/your-org/whisper" target="_blank" rel="noopener" className="ml-2 text-gray-400 hover:text-indigo-300 underline">GitHub</a>
            <a href="https://twitter.com/yourhandle" target="_blank" rel="noopener" className="ml-2 text-gray-400 hover:text-indigo-300 underline">Twitter</a>
          </div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/auth/signup" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded shadow">Get Started Free</Link>
            <a href="https://www.npmjs.com/package/whisper-ai" target="_blank" rel="noopener" className="bg-gray-900 hover:bg-gray-800 text-indigo-200 font-semibold px-6 py-3 rounded shadow border border-gray-700">npm install -g whisper-ai</a>
          </div>
        </div>
      </footer>

      {/* Animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: none; }
        }
        .animate-fade-in { animation: fade-in 0.8s cubic-bezier(.4,0,.2,1) both; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-slow { animation: bounce-slow 2.5s infinite; }
      `}</style>
    </div>
  );
}
