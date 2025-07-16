import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm"></div>
              </div>
              <span className="text-xl font-bold">SecureAI</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-300 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="text-gray-300 hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="#about" className="text-gray-300 hover:text-white transition-colors">
                About
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/signin" className="text-gray-300 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/auth/signup" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-8">
              <span className="text-purple-300 text-sm font-medium">AI-Powered Security Analysis</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Secure Your Code with
              <span className="gradient-text block">Advanced AI</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Identify vulnerabilities, analyze threats, and strengthen your applications with our cutting-edge AI security platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/auth/signup" className="btn-primary text-lg px-8 py-4">
                Start Free Trial
              </Link>
              <Link href="#demo" className="btn-secondary text-lg px-8 py-4">
                Watch Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Security Features</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need to secure your applications and protect your users
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card hover-lift">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                <div className="w-6 h-6 bg-purple-400 rounded"></div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Vulnerability Detection</h3>
              <p className="text-gray-300 leading-relaxed">
                Automatically scan your codebase for security vulnerabilities and get actionable insights to fix them.
              </p>
            </div>
            <div className="card hover-lift">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                <div className="w-6 h-6 bg-purple-400 rounded"></div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Real-time Monitoring</h3>
              <p className="text-gray-300 leading-relaxed">
                Monitor your applications continuously and receive instant alerts when threats are detected.
              </p>
            </div>
            <div className="card hover-lift">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                <div className="w-6 h-6 bg-purple-400 rounded"></div>
              </div>
              <h3 className="text-xl font-semibold mb-3">AI-Powered Analysis</h3>
              <p className="text-gray-300 leading-relaxed">
                Leverage machine learning to identify complex security patterns and predict potential threats.
              </p>
            </div>
            <div className="card hover-lift">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                <div className="w-6 h-6 bg-purple-400 rounded"></div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Compliance Reports</h3>
              <p className="text-gray-300 leading-relaxed">
                Generate comprehensive compliance reports for industry standards and regulations.
              </p>
            </div>
            <div className="card hover-lift">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                <div className="w-6 h-6 bg-purple-400 rounded"></div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Team Collaboration</h3>
              <p className="text-gray-300 leading-relaxed">
                Work together with your team to resolve security issues and share insights across projects.
              </p>
            </div>
            <div className="card hover-lift">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                <div className="w-6 h-6 bg-purple-400 rounded"></div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Integration Ready</h3>
              <p className="text-gray-300 leading-relaxed">
                Seamlessly integrate with your existing development workflow and CI/CD pipelines.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-gradient-to-r from-purple-900/10 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">10M+</div>
              <div className="text-gray-300 text-lg">Lines of Code Analyzed</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">50K+</div>
              <div className="text-gray-300 text-lg">Vulnerabilities Detected</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">99.9%</div>
              <div className="text-gray-300 text-lg">Uptime Guarantee</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Secure Your Applications?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of developers who trust our AI-powered security platform to protect their code.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="btn-primary text-lg px-8 py-4">
              Start Free Trial
            </Link>
            <Link href="#contact" className="btn-secondary text-lg px-8 py-4">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-sm"></div>
                </div>
                <span className="text-xl font-bold">SecureAI</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                AI-powered security analysis for modern applications.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#security" className="hover:text-white transition-colors">Security</Link></li>
                <li><Link href="#integrations" className="hover:text-white transition-colors">Integrations</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><Link href="#about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><Link href="#help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#api" className="hover:text-white transition-colors">API Reference</Link></li>
                <li><Link href="#status" className="hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-gray-300">
            <p>&copy; 2024 SecureAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
