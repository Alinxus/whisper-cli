'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlayIcon, 
  StopIcon, 
  MagnifyingGlassIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { scansApi, projectsApi, Scan, Project } from '../../lib/api';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import Link from 'next/link';

const statusConfig = {
  PENDING: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800',
    icon: ClockIcon,
  },
  RUNNING: {
    label: 'Running',
    color: 'bg-blue-100 text-blue-800',
    icon: ArrowPathIcon,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircleIcon,
  },
  FAILED: {
    label: 'Failed',
    color: 'bg-red-100 text-red-800',
    icon: XCircleIcon,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-800',
    icon: StopIcon,
  },
};

const severityConfig = {
  CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-800' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  MEDIUM: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  LOW: { label: 'Low', color: 'bg-blue-100 text-blue-800' },
  INFO: { label: 'Info', color: 'bg-gray-100 text-gray-800' },
};

interface ScanRowProps {
  scan: Scan;
  onCancel: (id: string) => void;
  isLoading: boolean;
}

function ScanRow({ scan, onCancel, isLoading }: ScanRowProps) {
  const statusInfo = statusConfig[scan.status];
  const StatusIcon = statusInfo.icon;

  const criticalCount = scan.findings?.filter(f => f.severity === 'CRITICAL').length || 0;
  const highCount = scan.findings?.filter(f => f.severity === 'HIGH').length || 0;
  const mediumCount = scan.findings?.filter(f => f.severity === 'MEDIUM').length || 0;
  const lowCount = scan.findings?.filter(f => f.severity === 'LOW').length || 0;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <StatusIcon className="h-5 w-5 text-gray-400 mr-3" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {scan.project?.name || 'Unknown Project'}
            </div>
            <div className="text-sm text-gray-500">
              {scan.branch} • {scan.totalFiles} files
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={clsx(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          statusInfo.color
        )}>
          {statusInfo.label}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {scan.status === 'COMPLETED' ? (
          <div className="flex space-x-2">
            {criticalCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {criticalCount} Critical
              </span>
            )}
            {highCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                {highCount} High
              </span>
            )}
            {mediumCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {mediumCount} Medium
              </span>
            )}
            {lowCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {lowCount} Low
              </span>
            )}
            {scan.issuesFound === 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                No issues
              </span>
            )}
          </div>
        ) : scan.status === 'RUNNING' ? (
          <div className="flex items-center">
            <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-500 mr-2" />
            <span className="text-blue-600">Scanning...</span>
          </div>
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {format(new Date(scan.startedAt), 'MMM d, yyyy HH:mm')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {scan.completedAt ? format(new Date(scan.completedAt), 'MMM d, yyyy HH:mm') : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          {scan.status === 'COMPLETED' && (
            <Link
              href={`/scans/${scan.id}`}
              className="text-indigo-600 hover:text-indigo-900"
            >
              View Details
            </Link>
          )}
          {scan.status === 'RUNNING' && (
            <button
              onClick={() => onCancel(scan.id)}
              disabled={isLoading}
              className="text-red-600 hover:text-red-900 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

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

export default function ScansPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const queryClient = useQueryClient();

  const { data: scansData = [], isLoading } = useQuery({
    queryKey: ['scans'],
    queryFn: () => scansApi.getScans(),
    refetchInterval: 5000, // Refresh every 5 seconds for running scans
  });

  // Ensure scans is always an array
  const scans = Array.isArray(scansData) ? scansData : [];

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects,
  });

  const { data: stats } = useQuery({
    queryKey: ['scan-stats'],
    queryFn: scansApi.getScanStats,
  });

  const cancelMutation = useMutation({
    mutationFn: scansApi.cancelScan,
    onSuccess: () => {
      toast.success('Scan cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['scans'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel scan');
    },
  });

  const handleCancel = (id: string) => {
    if (confirm('Are you sure you want to cancel this scan?')) {
      cancelMutation.mutate(id);
    }
  };

  const filteredScans = scans.filter((scan) => {
    const matchesSearch = scan.project?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         scan.branch?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = !selectedProject || scan.projectId === selectedProject;
    const matchesStatus = !selectedStatus || scan.status === selectedStatus;
    return matchesSearch && matchesProject && matchesStatus;
  });

  const runningScans = scans.filter(scan => scan.status === 'RUNNING').length;
  const completedScans = scans.filter(scan => scan.status === 'COMPLETED').length;
  const failedScans = scans.filter(scan => scan.status === 'FAILED').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#312e81] flex relative">
      <AnimatedLines />
      <DashboardLayout>
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2">Scans</h1>
          <p className="text-lg text-indigo-100">View and manage your security scans</p>
        </div>
        {/* Table and controls remain unchanged */}
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Running Scans
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {runningScans}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Completed
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {completedScans}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Issues
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.totalIssues || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircleIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Critical Issues
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.criticalIssues || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search scans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            {Object.entries(statusConfig).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        {/* Scans Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Findings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredScans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No scans found
                    </td>
                  </tr>
                ) : (
                  filteredScans.map((scan) => (
                    <ScanRow
                      key={scan.id}
                      scan={scan}
                      onCancel={handleCancel}
                      isLoading={cancelMutation.isPending}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DashboardLayout>
    </div>
  );
}
