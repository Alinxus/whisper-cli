'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CreditCardIcon, 
  CheckIcon, 
  XMarkIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowUpIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { billingApi, Plan, Subscription } from '../../lib/api';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { clsx } from 'clsx';
import { format, parseISO, differenceInDays } from 'date-fns';

interface UsageCardProps {
  title: string;
  current: number;
  limit: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  showProgress?: boolean;
}

function UsageCard({ title, current, limit, unit, icon: Icon, color, showProgress = true }: UsageCardProps) {
  const percentage = limit === -1 ? 0 : Math.min((current / limit) * 100, 100);
  const isUnlimited = limit === -1;
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={clsx('p-2 rounded-lg', color)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">
              {isUnlimited ? 'Unlimited' : `${current} / ${limit} ${unit}`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {isUnlimited ? '∞' : current}
          </div>
          <div className="text-sm text-gray-500">{unit}</div>
        </div>
      </div>
      
      {showProgress && !isUnlimited && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Usage</span>
            <span>{percentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={clsx(
                'h-2 rounded-full transition-all duration-300',
                percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface PlanCardProps {
  plan: Plan;
  isCurrentPlan: boolean;
  onUpgrade: (planId: string) => void;
  isLoading: boolean;
}

function PlanCard({ plan, isCurrentPlan, onUpgrade, isLoading }: PlanCardProps) {
  const isEnterprise = plan.id === 'enterprise';
  const isFree = plan.id === 'free';
  
  return (
    <div className={clsx(
      'rounded-lg border-2 p-6 relative',
      isCurrentPlan 
        ? 'border-indigo-500 bg-indigo-50' 
        : 'border-gray-200 bg-white hover:border-gray-300'
    )}>
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Current Plan
          </span>
        </div>
      )}
      
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
        <div className="mt-2">
          {isEnterprise ? (
            <div className="text-2xl font-bold text-gray-900">Custom</div>
          ) : (
            <div className="text-3xl font-bold text-gray-900">
              ${plan.price}
              <span className="text-base font-normal text-gray-600">/month</span>
            </div>
          )}
        </div>
        
        {plan.annual_price && (
          <div className="text-sm text-gray-600 mt-1">
            Save ${(plan.price as number) * 12 - plan.annual_price} annually
          </div>
        )}
      </div>

      <ul className="mt-6 space-y-3">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {isCurrentPlan ? (
          <button
            disabled
            className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-lg cursor-not-allowed"
          >
            Current Plan
          </button>
        ) : isEnterprise ? (
          <button
            onClick={() => window.open('mailto:sales@whisper-cli.dev', '_blank')}
            className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Contact Sales
          </button>
        ) : (
          <button
            onClick={() => onUpgrade(plan.id)}
            disabled={isLoading}
            className={clsx(
              'w-full py-2 px-4 rounded-lg transition-colors',
              isFree
                ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? 'Processing...' : isFree ? 'Downgrade' : 'Upgrade'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month');
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: async () => {
      const response = await billingApi.getPlans();
      return response.plans;
    },
  });

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: billingApi.getSubscription,
  });

  const checkoutMutation = useMutation({
    mutationFn: billingApi.createCheckout,
    onSuccess: (data) => {
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.success(data.message || 'Plan updated successfully');
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process upgrade');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: billingApi.cancelSubscription,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
    },
  });

  const handleUpgrade = (planId: string) => {
    checkoutMutation.mutate({ planId, interval: selectedInterval });
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      cancelMutation.mutate();
    }
  };

  const currentPlan = subscription?.plan || 'FREE';
  const planLimits = plans.find(p => p.id.toLowerCase() === currentPlan.toLowerCase())?.limits;
  
  // Calculate days remaining in current period
  const daysRemaining = subscription?.currentPeriodEnd 
    ? differenceInDays(parseISO(subscription.currentPeriodEnd), new Date())
    : 0;

  const usagePercentage = subscription?.scansLimit === -1 ? 0 : 
    Math.min((subscription?.scansUsed || 0) / (subscription?.scansLimit || 1) * 100, 100);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing & Usage</h1>
            <p className="text-gray-600">Manage your subscription and monitor usage</p>
          </div>
        </div>

        {/* Current Plan Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <CreditCardIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Current Plan</h3>
                <div className="flex items-center mt-1">
                  <span className="text-2xl font-bold text-gray-900">
                    {currentPlan.charAt(0) + currentPlan.slice(1).toLowerCase()}
                  </span>
                  <span className={clsx(
                    'ml-2 px-2 py-1 rounded-full text-xs font-medium',
                    subscription?.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  )}>
                    {subscription?.status || 'INACTIVE'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              {subscription?.currentPeriodEnd && (
                <div className="text-sm text-gray-500">
                  {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'}
                </div>
              )}
              {subscription?.status === 'ACTIVE' && subscription?.plan !== 'FREE' && (
                <button
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <UsageCard
            title="Security Scans"
            current={subscription?.scansUsed || 0}
            limit={subscription?.scansLimit || 10}
            unit="scans"
            icon={ChartBarIcon}
            color="bg-blue-500"
          />
          
          <UsageCard
            title="Repositories"
            current={1} // This would come from actual data
            limit={planLimits?.maxRepos || 1}
            unit="repos"
            icon={CalendarIcon}
            color="bg-green-500"
          />
          
          <UsageCard
            title="Files per Repo"
            current={0} // This would come from actual data
            limit={planLimits?.maxFilesPerRepo || 2500}
            unit="files"
            icon={ArrowUpIcon}
            color="bg-purple-500"
            showProgress={false}
          />
          
          <UsageCard
            title="AI Features"
            current={planLimits?.aiFixesEnabled ? 1 : 0}
            limit={1}
            unit="enabled"
            icon={SparklesIcon}
            color="bg-yellow-500"
            showProgress={false}
          />
        </div>

        {/* Usage Alert */}
        {usagePercentage > 80 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-800">
                  High Usage Alert
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  You've used {usagePercentage.toFixed(1)}% of your monthly scan quota. 
                  Consider upgrading to avoid service interruption.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Billing Interval Toggle */}
        <div className="flex items-center justify-center">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => setSelectedInterval('month')}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                selectedInterval === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedInterval('year')}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                selectedInterval === 'year'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Annual
              <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plansLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4" />
                <div className="h-8 bg-gray-200 rounded mb-6" />
                <div className="space-y-2">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-4 bg-gray-200 rounded" />
                  ))}
                </div>
              </div>
            ))
          ) : (
            plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={plan.id.toLowerCase() === currentPlan.toLowerCase()}
                onUpgrade={handleUpgrade}
                isLoading={checkoutMutation.isPending}
              />
            ))
          )}
        </div>

        {/* Billing History */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Billing History</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-12 text-gray-500">
              <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No billing history available yet</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
