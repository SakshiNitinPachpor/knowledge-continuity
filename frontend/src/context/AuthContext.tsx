import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getToken, setToken, removeToken } from '../services/api';

export type ThemePreference = 'light' | 'dark' | 'system';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  theme: ThemePreference;
  effectiveTheme: 'light' | 'dark';
  setThemePreference: (pref: ThemePreference) => void;
  toggleTheme: () => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, fullName: string, title: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemePreference>('light');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  // Applies the theme to document.documentElement
  const applyTheme = (pref: ThemePreference) => {
    let active: 'light' | 'dark';
    if (pref === 'system') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      active = prefersDark ? 'dark' : 'light';
    } else {
      active = pref;
    }

    setEffectiveTheme(active);
    if (active === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    // 1. Initialize theme preference
    const savedTheme = (localStorage.getItem('kc_theme') as ThemePreference) || 'light';
    setTheme(savedTheme);
    applyTheme(savedTheme);

    // 2. Media query listener for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      const current = localStorage.getItem('kc_theme') as ThemePreference;
      if (current === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);

    // 3. Check existing user token
    const token = getToken();
    if (token) {
      api.getMe()
        .then((userData) => setUser(userData))
        .catch(() => {
          removeToken();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, []);

  const setThemePreference = (pref: ThemePreference) => {
    setTheme(pref);
    localStorage.setItem('kc_theme', pref);
    applyTheme(pref);
  };

  const toggleTheme = () => {
    const next: ThemePreference = effectiveTheme === 'light' ? 'dark' : 'light';
    setThemePreference(next);
  };

  const login = async (email: string, pass: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email.trim());
    formData.append('password', pass);
    const res = await api.login(formData);
    setToken(res.access_token);
    setUser(res.user);
  };

  const register = async (email: string, fullName: string, title: string, pass: string) => {
    const res = await api.register({
      email: email.trim(),
      full_name: fullName.trim(),
      title: title.trim(),
      password: pass
    });
    setToken(res.access_token);
    setUser(res.user);
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const u = await api.getMe();
      setUser(u);
    } catch {
      // Ignored if unauthenticated
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        theme,
        effectiveTheme,
        setThemePreference,
        toggleTheme,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
