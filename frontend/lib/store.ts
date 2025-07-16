import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Organization, Project, Scan } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

interface AppState {
  currentOrganization: Organization | null;
  organizations: Organization[];
  projects: Project[];
  scans: Scan[];
  isLoading: boolean;
  error: string | null;
  setCurrentOrganization: (org: Organization | null) => void;
  setOrganizations: (orgs: Organization[]) => void;
  setProjects: (projects: Project[]) => void;
  setScans: (scans: Scan[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  removeProject: (id: string) => void;
  addScan: (scan: Scan) => void;
  updateScan: (id: string, scan: Partial<Scan>) => void;
  removeScan: (id: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'whisper-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export const useAppStore = create<AppState>()((set, get) => ({
  currentOrganization: null,
  organizations: [],
  projects: [],
  scans: [],
  isLoading: false,
  error: null,
  setCurrentOrganization: (currentOrganization) => set({ currentOrganization }),
  setOrganizations: (organizations) => set({ organizations }),
  setProjects: (projects) => set({ projects }),
  setScans: (scans) => set({ scans }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (id, updatedProject) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...updatedProject } : p)),
    })),
  removeProject: (id) =>
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) })),
  addScan: (scan) => set((state) => ({ scans: [...state.scans, scan] })),
  updateScan: (id, updatedScan) =>
    set((state) => ({
      scans: state.scans.map((s) => (s.id === id ? { ...s, ...updatedScan } : s)),
    })),
  removeScan: (id) => set((state) => ({ scans: state.scans.filter((s) => s.id !== id) })),
}));

// Notification store
interface NotificationState {
  notifications: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: Date;
  }[];
  addNotification: (notification: Omit<NotificationState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  addNotification: (notification) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id, timestamp: new Date() },
      ],
    }));
    // Auto-remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 5000);
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));
