'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon, 
  UserPlusIcon, 
  PencilIcon, 
  TrashIcon,
  UsersIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { organizationsApi, Organization, OrganizationMember } from '../../lib/api';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { clsx } from 'clsx';
import { format } from 'date-fns';

interface CreateOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreateOrgModal({ isOpen, onClose }: CreateOrgModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: organizationsApi.createOrganization,
    onSuccess: () => {
      toast.success('Organization created successfully');
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      onClose();
      setFormData({ name: '', description: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create organization');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 text-center">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        <div className="relative bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-medium mb-4">Create New Organization</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Acme Security Team"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Brief description of your organization"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
}

function InviteMemberModal({ isOpen, onClose, organization }: InviteMemberModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'MEMBER' as 'ADMIN' | 'MEMBER' | 'VIEWER',
  });
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: 'ADMIN' | 'MEMBER' | 'VIEWER' }) =>
      organizationsApi.inviteMember(organization.id, data),
    onSuccess: () => {
      toast.success('Invitation sent successfully');
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      onClose();
      setFormData({ email: '', role: 'MEMBER' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send invitation');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 text-center">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        <div className="relative bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-medium mb-4">Invite Team Member</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="colleague@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'MEMBER' | 'VIEWER' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="VIEWER">Viewer - Can view scans and results</option>
                <option value="MEMBER">Member - Can create and manage projects</option>
                <option value="ADMIN">Admin - Can manage organization and members</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface OrganizationCardProps {
  organization: Organization;
  onInvite: () => void;
  onDelete: () => void;
}

function OrganizationCard({ organization, onInvite, onDelete }: OrganizationCardProps) {
  const roleColors = {
    OWNER: 'bg-purple-100 text-purple-800',
    ADMIN: 'bg-blue-100 text-blue-800',
    MEMBER: 'bg-green-100 text-green-800',
    VIEWER: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-8 w-8 text-gray-400 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{organization.name}</h3>
              <p className="text-sm text-gray-500">{organization.slug}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onInvite}
              className="text-indigo-600 hover:text-indigo-900 text-sm"
            >
              <UserPlusIcon className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="text-red-600 hover:text-red-900 text-sm"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {organization.description && (
          <p className="text-gray-600 text-sm mb-4">{organization.description}</p>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span className="flex items-center">
            <UsersIcon className="h-4 w-4 mr-1" />
            {organization.members?.length || 0} members
          </span>
          <span>{format(new Date(organization.createdAt), 'MMM d, yyyy')}</span>
        </div>

        {organization.members && organization.members.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Team Members</h4>
            <div className="space-y-2">
              {organization.members.slice(0, 3).map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {member.user.firstName?.[0] || member.user.email[0]}
                      </span>
                    </div>
                    <span className="ml-2 text-sm text-gray-600">
                      {member.user.firstName || member.user.email}
                    </span>
                  </div>
                  <span className={clsx(
                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                    roleColors[member.role]
                  )}>
                    {member.role.toLowerCase()}
                  </span>
                </div>
              ))}
              {organization.members.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{organization.members.length - 3} more members
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
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

export default function OrganizationsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inviteModalOrg, setInviteModalOrg] = useState<Organization | null>(null);
  const queryClient = useQueryClient();

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsApi.getOrganizations,
  });

  const deleteMutation = useMutation({
    mutationFn: organizationsApi.deleteOrganization,
    onSuccess: () => {
      toast.success('Organization deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete organization');
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#312e81] flex relative">
      <AnimatedLines />
      <DashboardLayout>
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2">Organizations</h1>
          <p className="text-lg text-indigo-100">Manage your teams and organizations</p>
        </div>
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
            <p className="text-gray-600">Manage your teams and collaborate on security</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Organization
          </button>
        </div>

        {/* Organizations Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow animate-pulse">
                <div className="p-6">
                  <div className="h-6 bg-gray-200 rounded mb-2" />
                  <div className="h-4 bg-gray-200 rounded mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first organization to collaborate with your team.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New Organization
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <OrganizationCard
                key={org.id}
                organization={org}
                onInvite={() => setInviteModalOrg(org)}
                onDelete={() => handleDelete(org.id)}
              />
            ))}
          </div>
        )}
      </DashboardLayout>

      <CreateOrgModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {inviteModalOrg && (
        <InviteMemberModal
          isOpen={true}
          onClose={() => setInviteModalOrg(null)}
          organization={inviteModalOrg}
        />
      )}
    </div>
  );
}
