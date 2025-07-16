'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ChartBarIcon, 
  CpuChipIcon, 
  ClockIcon,
  CurrencyDollarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { aiApi, AIUsage, AIUsageStats } from '../../../lib/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { clsx } from 'clsx';
import { format } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, color = 'bg-blue-500' }: {
  title: string;
  value: string | number;
  icon: any;
  color?: string;
}) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center">
      <div className={clsx('p-2 rounded-lg', color)}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

const periods = [
  { value: 'day', label: 'Last 24 hours' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'year', label: 'Last year' }
];

export default function AIUsagePage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: usageStats, isLoading: statsLoading } = useQuery({
    queryKey: ['ai-usage-stats', selectedPeriod],
    queryFn: () => aiApi.getAIUsage(selectedPeriod),
  });

  const { data: aiDataResponse, isLoading: dataLoading } = useQuery({
    queryKey: ['ai-data', currentPage],
    queryFn: () => aiApi.getAIData(currentPage, 10),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Usage Analytics</h1>
            <p className="text-gray-600">Monitor your AI model usage and costs</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {periods.map(period => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Requests"
              value={usageStats?.totalRequests || 0}
              icon={ChartBarIcon}
              color="bg-blue-500"
            />
            <StatCard
              title="Total Tokens"
              value={(usageStats?.totalTokens || 0).toLocaleString()}
              icon={CpuChipIcon}
              color="bg-green-500"
            />
            <StatCard
              title="Total Cost"
              value={`$${(usageStats?.totalCost || 0).toFixed(2)}`}
              icon={CurrencyDollarIcon}
              color="bg-purple-500"
            />
            <StatCard
              title="Period"
              value={periods.find(p => p.value === selectedPeriod)?.label || 'Month'}
              icon={ClockIcon}
              color="bg-orange-500"
            />
          </div>
        )}

        {/* Model Breakdown */}
        {usageStats?.modelBreakdown && usageStats.modelBreakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Usage by Model</h3>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Model
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requests
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tokens
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usageStats.modelBreakdown.map((model, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {model.model}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {model.requests}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {model.tokens.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${model.cost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Recent AI Queries */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent AI Queries</h3>
          </div>
          <div className="p-6">
            {dataLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : aiDataResponse?.data && aiDataResponse.data.length > 0 ? (
              <div className="space-y-4">
                {aiDataResponse.data.map((query: AIUsage) => (
                  <div key={query.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{query.model}</span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(query.createdAt), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {query.prompt}
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-sm text-gray-500">
                          {query.tokensUsed} tokens
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          ${query.cost.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No AI queries found</p>
              </div>
            )}

            {/* Pagination */}
            {aiDataResponse?.pagination && aiDataResponse.pagination.pages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, aiDataResponse.pagination.total)} of {aiDataResponse.pagination.total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= aiDataResponse.pagination.pages}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
