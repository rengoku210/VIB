import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  riot_id: string | null;
  role: 'user' | 'seller' | 'moderator' | 'admin' | 'superadmin';
  status: 'active' | 'suspended' | 'banned' | 'pending_verification';
  email_verified: number;
  bio?: string;
  avatar?: string;
  discord_tag?: string;
  wallet_balance?: number;
  kyc_status?: string;
  total_orders?: number;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  riot_id?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup' | 'forgot';
  openAuthModal: (mode?: 'login' | 'signup' | 'forgot') => void;
  closeAuthModal: () => void;
  isAdmin: boolean;
  isSeller: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'vib_auth_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'forgot'>('login');

  const openAuthModal = (mode: 'login' | 'signup' | 'forgot' = 'login') => {
    setAuthModalMode(mode);
    setError(null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setError(null);
  };

  // Restore session from token on initial render
  const refreshUser = async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(savedToken);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      console.warn('[Auth] Network error validating session:', err);
      // Keep saved token in case of brief offline state, but don't crash
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  // Login handler
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMessage = data.error || 'Login failed. Please check your credentials.';
        setError(errMessage);
        return { success: false, error: errMessage };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      closeAuthModal();
      return { success: true };
    } catch (err: any) {
      const errMessage = 'Network connection failed. Please ensure the backend server is reachable.';
      setError(errMessage);
      return { success: false, error: errMessage };
    }
  };

  // Register handler
  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const resData = await res.json();

      if (!res.ok) {
        const errMessage = resData.error || 'Registration failed.';
        setError(errMessage);
        return { success: false, error: errMessage };
      }

      localStorage.setItem(TOKEN_KEY, resData.token);
      setToken(resData.token);
      setUser(resData.user);
      closeAuthModal();
      return { success: true };
    } catch (err: any) {
      const errMessage = 'Registration network error. Please try again.';
      setError(errMessage);
      return { success: false, error: errMessage };
    }
  };

  // Logout handler
  const logout = async (): Promise<void> => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.warn('Logout API notification error:', err);
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  // Update Profile
  const updateProfile = async (updates: Partial<User>): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await refreshUser();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const isAdmin = user ? ['admin', 'superadmin', 'moderator'].includes(user.role) : false;
  const isSeller = user ? ['seller', 'admin', 'superadmin'].includes(user.role) : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        isAdmin,
        isSeller,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
