'use client';
import { useQuery } from '@tanstack/react-query';
import { 
  ShieldCheckIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BoltIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  CodeBracketIcon,
  BugAntIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { scansApi, projectsApi } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  description?: string;
}

function StatCard({ title, value, change, changeType, icon: Icon, gradient, description }: StatCardProps) {
  const changeIcon = changeType === 'positive' ? ArrowTrendingUpIcon : changeType === 'negative' ? ArrowTrendingDownIcon : null;
  const ChangeIcon = changeIcon;
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative overflow-hidden bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
          <div className="flex items-baseline">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {change && ChangeIcon && (
              <div className={`ml-2 flex items-center text-sm ${
                changeType === 'positive' ? 'text-green-600' : 
                changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
              }`}>
                <ChangeIcon className="h-4 w-4 mr-1" />
                {change}
              </div>
            )}
          </div>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${gradient}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 opacity-5">
        <div className={`w-full h-full rounded-full ${gradient}`} />
      </div>
    </motion.div>
  );
}

interface SecurityScoreProps {
  score: number;
  trend: 'up' | 'down' | 'stable';
}

function SecurityScore({ score, trend }: SecurityScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 85) return 'from-green-500 to-emerald-600';
    if (score >= 70) return 'from-yellow-500 to-orange-600';
    return 'from-red-500 to-rose-600';
  };

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card hover-lift"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Security Score</h3>
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-lg bg-gradient-to-r ${getScoreGradient(score)}`}>
            <ShieldCheckIcon className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-center relative">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</div>
            <div className="text-sm text-gray-500">Score</div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Your security posture is {score >= 85 ? 'excellent' : score >= 70 ? 'good' : 'needs improvement'}
        </p>
      </div>
    </motion.div>
  );
}

interface RecentActivityProps {
  activities: Array<{
    id: string;
    type: 'scan' | 'fix' | 'alert';
    message: string;
    timestamp: Date;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

function RecentActivity({ activities }: RecentActivityProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'scan': return BugAntIcon;
      case 'fix': return CheckCircleIcon;
      case 'alert': return ExclamationTriangleIcon;
      default: return ClockIcon;
    }
  };

  const getActivityColor = (type: string, severity?: string) => {
    if (severity === 'critical') return 'bg-red-500';
    if (severity === 'high') return 'bg-orange-500';
    if (severity === 'medium') return 'bg-yellow-500';
    if (severity === 'low') return 'bg-blue-500';
    
    switch (type) {
      case 'scan': return 'bg-purple-500';
      case 'fix': return 'bg-green-500';
      case 'alert': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <Link href="/scans" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
          View all
        </Link>
      </div>
      
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = getActivityIcon(activity.type);
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className={`p-2 rounded-lg ${getActivityColor(activity.type, activity.severity)}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activity.message}
                </p>
                <p className="text-xs text-gray-500">
                  {format(activity.timestamp, 'MMM d, yyyy at h:mm a')}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  
  const { data: stats } = useQuery({
    queryKey: ['scan-stats'],
    queryFn: scansApi.getScanStats,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects,
  });

  // Mock data for demo
  const mockActivities = [
    {
      id: '1',
      type: 'scan' as const,
      message: 'Security scan completed for Project Alpha',
      timestamp: new Date(),
      severity: 'medium' as const
    },
    {
      id: '2',
      type: 'fix' as const,
      message: 'SQL injection vulnerability fixed',
      timestamp: new Date(Date.now() - 3600000),
      severity: 'high' as const
    },
    {
      id: '3',
      type: 'alert' as const,
      message: 'Critical security issue detected',
      timestamp: new Date(Date.now() - 7200000),
      severity: 'critical' as const
    }
  ];

  const securityScore = 78; // Mock score

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2"
          >
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.firstName || user?.username || 'User'}
            </h1>
            <p className="text-gray-600 mt-1">
              Here's your security overview for today
            </p>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Scans"
            value={stats?.totalScans || 0}
            change="+12%"
            changeType="positive"
            icon={BugAntIcon}
            gradient="bg-gradient-to-r from-purple-500 to-purple-600"
            description="This month"
          />
          
          <StatCard
            title="Critical Issues"
            value={stats?.criticalIssues || 0}
            change="-8%"
            changeType="positive"
            icon={FireIcon}
            gradient="bg-gradient-to-r from-red-500 to-red-600"
            description="Needs immediate attention"
          />
          
          <StatCard
            title="Projects"
            value={projects.length}
            icon={CodeBracketIcon}
            gradient="bg-gradient-to-r from-blue-500 to-blue-600"
            description="Active repositories"
          />
          
          <StatCard
            title="AI Fixes"
            value={156}
            change="+23%"
            changeType="positive"
            icon={SparklesIcon}
            gradient="bg-gradient-to-r from-green-500 to-green-600"
            description="Auto-generated solutions"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Security Score */}
          <div className="lg:col-span-1">
            <SecurityScore score={securityScore} trend="up" />
          </div>
          
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <RecentActivity activities={mockActivities} />
          </div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/projects" className="group">
              <div className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <CodeBracketIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">New Project</h4>
                    <p className="text-sm text-gray-500">Create a new security project</p>
                  </div>
                </div>
              </div>
            </Link>
            
            <Link href="/scans" className="group">
              <div className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <BugAntIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Run Scan</h4>
                    <p className="text-sm text-gray-500">Start a security scan</p>
                  </div>
                </div>
              </div>
            </Link>
            
            <Link href="/ai" className="group">
              <div className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <SparklesIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">AI Assistant</h4>
                    <p className="text-sm text-gray-500">Get AI-powered help</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
