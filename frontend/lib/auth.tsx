import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from './api';
import { useAuthStore } from './store';
import Cookies from 'js-cookie';

interface AuthContextType {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const router = useRouter();
  const { user, token, isAuthenticated, setUser, setToken, setLoading, logout: storeLogout } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = Cookies.get('whisper_token');
      if (savedToken && !user) {
        try {
          setLoading(true);
          const userData = await authApi.getMe();
          setUser(userData);
          setToken(savedToken);
        } catch (error) {
          console.error('Auth initialization failed:', error);
          Cookies.remove('whisper_token');
          storeLogout();
        } finally {
          setLoading(false);
        }
      }
    };

    initAuth();
  }, [user, setUser, setToken, setLoading, storeLogout]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { user, token } = await authApi.login({ email, password });
      setUser(user);
      setToken(token);
      Cookies.set('whisper_token', token, { expires: 7 }); // 7 days
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('whisper_token');
      storeLogout();
      router.push('/auth/login');
    }
  };

  const value = {
    login,
    logout,
    isLoading: useAuthStore((state) => state.isLoading),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// HOC for protected routes
export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
      if (!isAuthenticated) {
        router.push('/auth/login');
      }
    }, [isAuthenticated, router]);

    if (!isAuthenticated) {
      return <div>Loading...</div>;
    }

    return <Component {...props} />;
  };
};
