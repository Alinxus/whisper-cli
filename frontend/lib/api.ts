import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = Cookies.get('whisper_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors and provide detailed error feedback
api.interceptors.response.use(
  (response) => {
    // Log successful API calls in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
        headers: response.headers
      });
    }
    return response;
  },
  (error) => {
    // Enhanced error logging with detailed information
    const errorInfo = {
      message: error.message,
      config: {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        timeout: error.config?.timeout,
        headers: error.config?.headers
      },
      request: {
        readyState: error.request?.readyState,
        status: error.request?.status,
        statusText: error.request?.statusText,
        responseURL: error.request?.responseURL
      },
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      } : null,
      isNetworkError: !error.response,
      isTimeout: error.code === 'ECONNABORTED',
      timestamp: new Date().toISOString()
    };

    // Console error feedback based on error type
    if (error.response) {
      // Server responded with error status
      console.error(`🔴 API Error: ${error.response.status} ${error.response.statusText}`, {
        endpoint: `${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        message: error.response.data?.message || error.response.data || 'Unknown server error',
        fullError: errorInfo
      });
      
      // Specific error status handling
      switch (error.response.status) {
        case 400:
          console.warn('⚠️  Bad Request: Check your request parameters and payload');
          break;
        case 401:
          console.warn('🔐 Unauthorized: Authentication required or token expired');
          break;
        case 403:
          console.warn('🚫 Forbidden: Insufficient permissions');
          break;
        case 404:
          console.warn('🔍 Not Found: Resource does not exist');
          break;
        case 429:
          console.warn('⏳ Rate Limited: Too many requests');
          break;
        case 500:
          console.error('💥 Internal Server Error: Backend server error');
          break;
        case 502:
          console.error('🔗 Bad Gateway: Server received invalid response');
          break;
        case 503:
          console.error('🚫 Service Unavailable: Server temporarily down');
          break;
        case 504:
          console.error('⏱️  Gateway Timeout: Server did not respond in time');
          break;
        default:
          console.error(`❌ HTTP ${error.response.status}: ${error.response.statusText}`);
      }
    } else if (error.request) {
      // Request made but no response received (network error)
      console.error('🌐 Network Error: No response from server', {
        endpoint: `${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        baseURL: error.config?.baseURL,
        timeout: error.config?.timeout,
        message: 'Check if the backend server is running on the correct port (5000)',
        fullError: errorInfo
      });
      
      if (error.code === 'ECONNABORTED') {
        console.error('⏱️  Request Timeout: Request took too long to complete');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('🔌 Connection Refused: Backend server is not running or not accessible');
      } else if (error.code === 'ENOTFOUND') {
        console.error('🔍 DNS Error: Cannot resolve server hostname');
      } else {
        console.error('❌ Network Error:', error.message);
      }
    } else {
      // Something else happened during request setup
      console.error('⚙️  Request Setup Error:', {
        message: error.message,
        fullError: errorInfo
      });
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      console.warn('🔐 Authentication failed - redirecting to login');
      Cookies.remove('whisper_token');
      window.location.href = '/auth/login';
    }

    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  subscription?: Subscription;
}

export interface Subscription {
  id: string;
  plan: 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE';
  status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'PAST_DUE';
  scansUsed: number;
  scansLimit: number;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  members: OrganizationMember[];
  projects: Project[];
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  repositoryUrl?: string;
  branch: string;
  isActive: boolean;
  ownerId: string;
  organizationId?: string;
  config?: any;
  createdAt: string;
  updatedAt: string;
  owner: User;
  organization?: Organization;
  scans: Scan[];
}

export interface Scan {
  id: string;
  projectId: string;
  userId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  branch: string;
  commit?: string;
  diffHash?: string;
  totalFiles: number;
  issuesFound: number;
  startedAt: string;
  completedAt?: string;
  metadata?: any;
  project: Project;
  user: User;
  findings: Finding[];
}

export interface Finding {
  id: string;
  scanId: string;
  file: string;
  line?: number;
  column?: number;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  message: string;
  description?: string;
  fix?: string;
  confidence: number;
  code?: string;
  createdAt: string;
  scan: Scan;
}

export interface ScanRequest {
  projectPath: string;
  totalFiles: number;
  issuesFound: number;
  findings: {
    file: string;
    issues: Array<{
      type: string;
      severity: string;
      message: string;
      line?: number;
      column?: number;
      fix?: string;
      confidence: number;
      code?: string;
    }>;
    confidence: number;
    lens: {
      sast: number;
      sdast: number;
      iac: number;
      realFlow: number;
    };
  }[];
  metadata: {
    timestamp: string;
    version: string;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

// Device Flow OAuth types
export interface DeviceFlowRequest {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
}

export interface DeviceTokenResponse {
  accessToken: string;
  user: User;
  expiresIn: number;
}

// Auth API
export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/register', credentials);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async getMe(): Promise<User> {
    const response = await api.get('/me');
    return response.data.user;
  },

  async refreshToken(): Promise<AuthResponse> {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password });
  },

  async verifyEmail(token: string): Promise<void> {
    await api.post('/auth/verify-email', { token });
  },

  async resendVerification(email: string): Promise<void> {
    await api.post('/auth/resend-verification', { email });
  },

  // Device Flow OAuth for CLI
  async initiateDeviceFlow(): Promise<DeviceFlowRequest> {
    const response = await api.post('/auth/device/init');
    return response.data;
  },

  async pollDeviceToken(deviceCode: string): Promise<DeviceTokenResponse> {
    const response = await api.post('/auth/device/poll', { deviceCode });
    return response.data;
  },

  async verifyDeviceCode(userCode: string): Promise<void> {
    const response = await api.post('/auth/device/verify', { userCode });
    return response.data;
  },

  async authorizeDevice(userCode: string): Promise<void> {
    const response = await api.post('/auth/device/authorize', { userCode });
    return response.data;
  },
};

// Organizations API
export const organizationsApi = {
  async getOrganizations(): Promise<Organization[]> {
    const response = await api.get('/organizations');
    return response.data;
  },

  async getOrganization(id: string): Promise<Organization> {
    const response = await api.get(`/organizations/${id}`);
    return response.data;
  },

  async createOrganization(data: {
    name: string;
    description?: string;
  }): Promise<Organization> {
    const response = await api.post('/organizations', data);
    return response.data;
  },

  async updateOrganization(
    id: string,
    data: {
      name?: string;
      description?: string;
    }
  ): Promise<Organization> {
    const response = await api.patch(`/organizations/${id}`, data);
    return response.data;
  },

  async deleteOrganization(id: string): Promise<void> {
    await api.delete(`/organizations/${id}`);
  },

  async inviteMember(
    organizationId: string,
    data: {
      email: string;
      role: 'ADMIN' | 'MEMBER' | 'VIEWER';
    }
  ): Promise<void> {
    await api.post(`/organizations/${organizationId}/invite`, data);
  },

  async removeMember(organizationId: string, userId: string): Promise<void> {
    await api.delete(`/organizations/${organizationId}/members/${userId}`);
  },

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: 'ADMIN' | 'MEMBER' | 'VIEWER'
  ): Promise<void> {
    await api.patch(`/organizations/${organizationId}/members/${userId}`, {
      role,
    });
  },
};

// Projects API
export const projectsApi = {
  async getProjects(): Promise<Project[]> {
    const response = await api.get('/projects');
    return response.data.projects || response.data;
  },

  async getProject(id: string): Promise<Project> {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  async createProject(data: {
    name: string;
    description?: string;
    repositoryUrl?: string;
    branch?: string;
    organizationId?: string;
  }): Promise<Project> {
    const response = await api.post('/projects', data);
    return response.data;
  },

  async updateProject(
    id: string,
    data: {
      name?: string;
      description?: string;
      repositoryUrl?: string;
      branch?: string;
    }
  ): Promise<Project> {
    const response = await api.patch(`/projects/${id}`, data);
    return response.data;
  },

  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },
};

// Scans API
export const scansApi = {
  async getScans(projectId?: string): Promise<Scan[]> {
    const response = await api.get('/scans', {
      params: projectId ? { projectId } : {},
    });
    return response.data;
  },

  async getScan(id: string): Promise<Scan> {
    const response = await api.get(`/scans/${id}`);
    return response.data;
  },

  async createScan(data: ScanRequest): Promise<Scan> {
    const response = await api.post('/scans', data);
    return response.data;
  },

  async cancelScan(id: string): Promise<void> {
    await api.post(`/scans/${id}/cancel`);
  },

  async getScanFindings(scanId: string): Promise<Finding[]> {
    const response = await api.get(`/scans/${scanId}/findings`);
    return response.data;
  },

  async getScanStats(): Promise<{
    totalScans: number;
    recentScans: number;
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    infoIssues: number;
  }> {
    const response = await api.get('/scans/stats');
    return response.data;
  },
};

// AI Types
export interface AIUsage {
  id: string;
  model: string;
  prompt: string;
  tokensUsed: number;
  cost: number;
  createdAt: string;
}

export interface AIUsageStats {
  period: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  modelBreakdown: {
    model: string;
    requests: number;
    tokens: number;
    cost: number;
  }[];
}

// AI API
export const aiApi = {
  async queryAI(data: {
    model: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }): Promise<{ response: string }> {
    const response = await api.post('/ai/query', data);
    return response.data;
  },

  async getAIData(page: number = 1, limit: number = 20): Promise<{
    data: AIUsage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get('/ai/data', {
      params: { page, limit }
    });
    return response.data;
  },

  async getAIUsage(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<AIUsageStats> {
    const response = await api.get('/ai/usage', {
      params: { period }
    });
    return response.data;
  },
};

// Billing types
export interface Plan {
  id: string;
  name: string;
  price: number | string;
  interval: string;
  annual_price?: number;
  features: string[];
  limits: {
    scansPerMonth: number;
    maxRepos: number;
    maxFilesPerRepo: number;
    aiFixesEnabled: boolean;
    teamFeaturesEnabled: boolean;
  };
}

export interface Usage {
  scansUsed: number;
  scansLimit: number;
  currentPeriod: {
    start: string;
    end: string;
  };
  plan: string;
  status: string;
}

export interface BillingInfo {
  subscription: Subscription;
  usage: Usage;
  nextBillingDate?: string;
  paymentMethod?: {
    type: string;
    last4: string;
    brand: string;
  };
}

// Billing API
export const billingApi = {
  async getPlans(): Promise<{ plans: Plan[] }> {
    const response = await api.get('/billing/plans');
    return response.data;
  },

  async getSubscription(): Promise<Subscription> {
    const response = await api.get('/billing/subscription');
    return response.data;
  },

  async createCheckout(data: {
    planId: string;
    interval?: 'month' | 'year';
  }): Promise<{ success: boolean; checkoutUrl?: string; message?: string }> {
    const response = await api.post('/billing/checkout', data);
    return response.data;
  },

  async cancelSubscription(): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/billing/cancel');
    return response.data;
  },

  async getUsage(): Promise<Usage> {
    const response = await api.get('/billing/usage');
    return response.data;
  },

  async getBillingInfo(): Promise<BillingInfo> {
    const response = await api.get('/billing/info');
    return response.data;
  },
};

// Health check
export const healthApi = {
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;
