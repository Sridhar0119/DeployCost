import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Ensure withCredentials is set globally for session cookies
axios.defaults.withCredentials = true;

// Add request interceptor to attach custom session ID header if present in localStorage
// This enables authentication inside cross-origin iframes where cookies are blocked
axios.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('deploycost_session_id');
  if (sessionId) {
    config.headers['X-Session-ID'] = sessionId;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Custom base URL from env if needed
const API_URL = import.meta.env.VITE_API_URL || '';

export interface User {
  id: number;
  email: string;
  name: string;
  avatar_url: string | null;
  oauth_provider: 'google' | 'github' | 'dev';
  oauth_id: string;
  org_id: number;
  role: 'member' | 'org_admin' | 'super_admin';
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isOrgAdmin: boolean;
  isSuperAdmin: boolean;
  providers: { google: boolean; github: boolean };
  loginWithGoogle: () => void;
  loginWithGitHub: () => void;
  devLogin: (email: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState({ google: false, github: false });

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`);
      if (response.data && response.data.user) {
        setUser(response.data.user);
        if (response.data.sessionID) {
          localStorage.setItem('deploycost_session_id', response.data.sessionID);
        }
      } else {
        setUser(null);
        localStorage.removeItem('deploycost_session_id');
      }
    } catch (err) {
      console.error('[AuthContext] Failed to retrieve current user session', err);
      setUser(null);
      localStorage.removeItem('deploycost_session_id');
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/providers`);
      if (response.data) {
        setProviders(response.data);
      }
    } catch (err) {
      console.error('[AuthContext] Failed to retrieve auth providers', err);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchProviders();

    // Listen for OAuth Success message from popup window
    const handleOAuthMessage = (event: MessageEvent) => {
      // Allow local development and run.app secure origins
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        console.log('[AuthContext] OAuth login callback success received.');
        fetchUser();
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const loginWithGoogle = () => {
    // Open provider auth directly in a popup window
    const popupUrl = `${API_URL}/api/auth/google`;
    window.open(popupUrl, 'google_oauth_popup', 'width=600,height=700');
  };

  const loginWithGitHub = () => {
    // Open provider auth directly in a popup window
    const popupUrl = `${API_URL}/api/auth/github`;
    window.open(popupUrl, 'github_oauth_popup', 'width=600,height=700');
  };

  const devLogin = async (email: string, name: string) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/dev-login`, { email, name });
      if (response.data && response.data.user) {
        setUser(response.data.user);
        if (response.data.sessionID) {
          localStorage.setItem('deploycost_session_id', response.data.sessionID);
        }
      }
    } catch (err: any) {
      console.error('[AuthContext] Dev login failed:', err);
      throw new Error(err.response?.data?.error || 'Developer Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`);
    } catch (err) {
      console.error('[AuthContext] Logout error:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('deploycost_session_id');
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const isOrgAdmin = user ? (user.role === 'org_admin' || user.role === 'super_admin') : false;
  const isSuperAdmin = user ? user.role === 'super_admin' : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isOrgAdmin,
        isSuperAdmin,
        providers,
        loginWithGoogle,
        loginWithGitHub,
        devLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
