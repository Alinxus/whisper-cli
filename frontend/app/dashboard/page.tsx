'use client';
import Link from "next/link";
import { useQuery } from '@tanstack/react-query';
import { scansApi, projectsApi } from '../../lib/api';
import { dashboardApi } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { format } from 'date-fns';
import { BugAntIcon, FireIcon, CodeBracketIcon, SparklesIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/scans", label: "Scans" },
  { href: "/billing", label: "Billing" },
  { href: "/docs", label: "Docs" },
  { href: "/profile", label: "Profile" },
];

function StatCard({ title, value, icon: Icon, gradient, description } : any) {
  return (
    <div className={`rounded-xl p-6 border-2 ${gradient} shadow-lg flex flex-col items-start min-h-[120px]`}> 
      <div className="flex items-center mb-2">
        <Icon className="h-7 w-7 mr-3 text-white/80" />
        <span className="text-lg font-semibold text-white/90">{title}</span>
      </div>
      <div className="text-3xl font-extrabold text-white mb-1">{value}</div>
      {description && <div className="text-sm text-indigo-100">{description}</div>}
    </div>
  );
}

// Remove SecurityScore and RecentActivity components
// Add RecentScans component
function RecentScans({ scans }: any) {
  return (
    <div className="bg-gradient-to-br from-indigo-900/80 to-indigo-800/60 rounded-2xl p-6 shadow-lg border-2 border-indigo-800">
      <div className="text-lg font-semibold text-white mb-4">Recent Scans</div>
      <ul className="space-y-4">
        {scans.map((scan: any) => (
          <li key={scan.id} className="flex items-center gap-3">
            <BugAntIcon className="h-5 w-5 text-indigo-300" />
            <div>
              <div className="text-white font-medium">
                {scan.project?.name || 'Unknown Project'} - {scan.status}
              </div>
              <div className="text-xs text-indigo-200">
                {scan.startedAt ? format(new Date(scan.startedAt), 'MMM d, HH:mm') : ''}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  // Fetch dashboard overview data
  const { data: overview } = useQuery({ queryKey: ['dashboard-overview'], queryFn: dashboardApi.getOverview });
  const stats = overview?.stats || {};
  const recentScans = overview?.recentScans || [];
  const projectsCount = stats.totalProjects || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#312e81] flex">
      {/* Sidebar Nav */}
      <aside className="hidden md:flex flex-col w-64 bg-black/60 border-r border-indigo-900/40 py-8 px-4 sticky top-0 h-screen z-40">
        <div className="mb-10 text-2xl font-extrabold text-indigo-400 tracking-tight">Whisper</div>
        <nav className="flex flex-col gap-2">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="px-4 py-2 rounded text-lg font-medium text-indigo-200 hover:bg-indigo-900/30 hover:text-white transition">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-10">
          <Link href="/auth/logout" className="block px-4 py-2 rounded text-lg font-medium text-red-300 hover:bg-red-900/30 hover:text-white transition">Logout</Link>
        </div>
      </aside>
      {/* Main Content */}
      <main className="flex-1 min-h-screen px-4 md:px-12 py-10 md:py-16">
        {/* Hero/Welcome */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2">Welcome back, {user?.firstName || user?.username || 'User'} 👋</h1>
          <p className="text-lg text-indigo-100">Here’s your security overview for today</p>
        </div>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <StatCard title="Total Scans" value={stats.totalScans || 0} icon={BugAntIcon} gradient="bg-gradient-to-br from-indigo-700 to-indigo-900 border-indigo-800" description="This month" />
          <StatCard title="Critical Issues" value={stats.criticalFindings || 0} icon={FireIcon} gradient="bg-gradient-to-br from-red-600 to-red-900 border-red-800" description="Needs attention" />
          <StatCard title="Projects" value={projectsCount} icon={CodeBracketIcon} gradient="bg-gradient-to-br from-blue-700 to-blue-900 border-blue-800" description="Active repositories" />
        </div>
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Recent Scans */}
          <div className="lg:col-span-2">
            <RecentScans scans={recentScans} />
          </div>
        </div>
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          <Link href="/projects" className="group">
            <div className="p-6 rounded-xl border-2 border-indigo-700 bg-indigo-900/40 hover:bg-indigo-800/60 transition-all duration-200 shadow-lg flex flex-col items-center">
              <CodeBracketIcon className="h-7 w-7 text-indigo-300 mb-2" />
              <h4 className="font-medium text-white">New Project</h4>
              <p className="text-sm text-indigo-100">Create a new security project</p>
            </div>
          </Link>
          <Link href="/scans" className="group">
            <div className="p-6 rounded-xl border-2 border-indigo-700 bg-indigo-900/40 hover:bg-indigo-800/60 transition-all duration-200 shadow-lg flex flex-col items-center">
              <BugAntIcon className="h-7 w-7 text-indigo-300 mb-2" />
              <h4 className="font-medium text-white">Run Scan</h4>
              <p className="text-sm text-indigo-100">Start a security scan</p>
            </div>
          </Link>
          <Link href="/ai" className="group">
            <div className="p-6 rounded-xl border-2 border-indigo-700 bg-indigo-900/40 hover:bg-indigo-800/60 transition-all duration-200 shadow-lg flex flex-col items-center">
              <SparklesIcon className="h-7 w-7 text-indigo-300 mb-2" />
              <h4 className="font-medium text-white">AI Assistant</h4>
              <p className="text-sm text-indigo-100">Get AI-powered help</p>
            </div>
          </Link>
          <Link href="/docs" className="group">
            <div className="p-6 rounded-xl border-2 border-indigo-700 bg-indigo-900/40 hover:bg-indigo-800/60 transition-all duration-200 shadow-lg flex flex-col items-center">
              <SparklesIcon className="h-7 w-7 text-indigo-300 mb-2" />
              <h4 className="font-medium text-white">Docs</h4>
              <p className="text-sm text-indigo-100">Read the documentation</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
