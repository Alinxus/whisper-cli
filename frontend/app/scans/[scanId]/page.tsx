'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { 
  ArrowLeftIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  BugAntIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { scansApi, Scan } from '../../../lib/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { clsx } from 'clsx';
import { format } from 'date-fns';

const severityConfig = {
  CRITICAL: { 
    label: 'Critical', 
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: ExclamationTriangleIcon,
    iconColor: 'text-red-500'
  },
  HIGH: { 
    label: 'High', 
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: XCircleIcon,
    iconColor: 'text-orange-500'
  },
  MEDIUM: { 
    label: 'Medium', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: ExclamationTriangleIcon,
    iconColor: 'text-yellow-500'
  },
  LOW: { 
    label: 'Low', 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: InformationCircleIcon,
    iconColor: 'text-blue-500'
  },
  INFO: { 
    label: 'Info', 
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: InformationCircleIcon,
    iconColor: 'text-gray-500'
  },
};

interface FindingCardProps {
  finding: any;
  isExpanded: boolean;
  onToggle: () => void;
}

function FindingCard({ finding, isExpanded, onToggle }: FindingCardProps) {
  const severityInfo = severityConfig[finding.severity];
  const SeverityIcon = severityInfo.icon;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <SeverityIcon className={clsx('h-5 w-5 mt-0.5', severityInfo.iconColor)} />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-900">{finding.title}</h3>
                <span className={clsx(
                  'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                  severityInfo.color
                )}>
                  {severityInfo.label}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{finding.description}</p>
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center">
                  <CodeBracketIcon className="h-3 w-3 mr-1" />
                  {finding.file}
                </span>
                {finding.line && (
                  <span>Line {finding.line}</span>
                )}
                {finding.rule && (
                  <span className="flex items-center">
                    <BugAntIcon className="h-3 w-3 mr-1" />
                    {finding.rule}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center">
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="mt-4 space-y-4">
            {finding.codeSnippet && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Code Snippet</h4>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                  <code>{finding.codeSnippet}</code>
                </pre>
              </div>
            )}
            
            {finding.recommendation && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendation</h4>
                <p className="text-sm text-gray-600">{finding.recommendation}</p>
              </div>
            )}
            
            {finding.references && finding.references.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">References</h4>
                <ul className="text-sm text-blue-600 space-y-1">
                  {finding.references.map((ref, index) => (
                    <li key={index}>
                      <a href={ref} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {ref}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {finding.confidence && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Confidence</h4>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={clsx(
                        'h-2 rounded-full',
                        finding.confidence >= 80 ? 'bg-green-500' :
                        finding.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      )}
                      style={{ width: `${finding.confidence}%` }}
                    />
                  </div>
                  <span className="ml-2 text-xs text-gray-600">{finding.confidence}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.scanId as string;
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedFile, setSelectedFile] = useState('');

  const { data: scan, isLoading, error } = useQuery({
    queryKey: ['scan', scanId],
    queryFn: () => scansApi.getScan(scanId),
    enabled: !!scanId,
  });

  const toggleFinding = (findingId: string) => {
    const newExpanded = new Set(expandedFindings);
    if (newExpanded.has(findingId)) {
      newExpanded.delete(findingId);
    } else {
      newExpanded.add(findingId);
    }
    setExpandedFindings(newExpanded);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !scan) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <XCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Scan not found</h2>
          <p className="text-gray-600 mb-4">The scan you're looking for doesn't exist or has been deleted.</p>
          <button
            onClick={() => router.push('/scans')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Scans
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const findings = scan.findings || [];
  const filteredFindings = findings.filter(finding => {
    const matchesSeverity = !selectedSeverity || finding.severity === selectedSeverity;
    const matchesFile = !selectedFile || finding.file === selectedFile;
    return matchesSeverity && matchesFile;
  });

  const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = findings.filter(f => f.severity === 'HIGH').length;
  const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;
  const lowCount = findings.filter(f => f.severity === 'LOW').length;

  const uniqueFiles = [...new Set(findings.map(f => f.file))].sort();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/scans')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Scans
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Scan Report: {scan.project?.name || 'Unknown Project'}
              </h1>
              <p className="text-gray-600">
                {scan.branch} • {format(new Date(scan.startedAt), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-500">{scan.totalFiles} files scanned</span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Critical</p>
                <p className="text-2xl font-semibold text-gray-900">{criticalCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-6 w-6 text-orange-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">High</p>
                <p className="text-2xl font-semibold text-gray-900">{highCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Medium</p>
                <p className="text-2xl font-semibold text-gray-900">{mediumCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <InformationCircleIcon className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Low</p>
                <p className="text-2xl font-semibold text-gray-900">{lowCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Severity
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by File
            </label>
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Files</option>
              {uniqueFiles.map(file => (
                <option key={file} value={file}>{file}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Findings List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              Findings ({filteredFindings.length})
            </h2>
            <button
              onClick={() => {
                if (expandedFindings.size === filteredFindings.length) {
                  setExpandedFindings(new Set());
                } else {
                  setExpandedFindings(new Set(filteredFindings.map(f => f.id)));
                }
              }}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              {expandedFindings.size === filteredFindings.length ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
          
          {filteredFindings.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No findings</h3>
              <p className="text-gray-600">
                {findings.length === 0 
                  ? 'This scan found no security issues. Great job!' 
                  : 'No findings match your current filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFindings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  isExpanded={expandedFindings.has(finding.id)}
                  onToggle={() => toggleFinding(finding.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Scan Metadata */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Scan Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Project</dt>
              <dd className="text-sm text-gray-900">{scan.project?.name || 'Unknown'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Branch</dt>
              <dd className="text-sm text-gray-900">{scan.branch}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Started At</dt>
              <dd className="text-sm text-gray-900">
                {format(new Date(scan.startedAt), 'MMM d, yyyy HH:mm:ss')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Completed At</dt>
              <dd className="text-sm text-gray-900">
                {scan.completedAt ? format(new Date(scan.completedAt), 'MMM d, yyyy HH:mm:ss') : 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Duration</dt>
              <dd className="text-sm text-gray-900">
                {scan.completedAt 
                  ? `${Math.round((new Date(scan.completedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000)}s`
                  : 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Files</dt>
              <dd className="text-sm text-gray-900">{scan.totalFiles}</dd>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
