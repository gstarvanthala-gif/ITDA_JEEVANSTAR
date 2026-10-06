import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { authApi, setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => localStorage.getItem('microgrow_token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      if (!token) {
        setUser(null);
        setAuthToken(null);
        setLoading(false);
        return;
      }

      setAuthToken(token);

      try {
        const response = await authApi.me();
        setUser(response.data.user);
      } catch (error) {
        localStorage.removeItem('microgrow_token');
        setTokenState('');
        setAuthToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [token]);

  const setToken = (nextToken) => {
    if (nextToken) {
      localStorage.setItem('microgrow_token', nextToken);
    } else {
      localStorage.removeItem('microgrow_token');
    }

    setTokenState(nextToken || '');
    setAuthToken(nextToken || null);
  };

  const login = async (credentials) => {
    const response = await authApi.login(credentials);
    const nextToken = response.data.token;
    setToken(nextToken);
    setUser(response.data.user);
    return response;
  };

  const register = async (payload) => {
    const response = await authApi.register(payload);
    const nextToken = response.data.token;
    setToken(nextToken);
    setUser(response.data.user);
    return response;
  };

  const logout = async () => {
    try {
      if (token) {
        await authApi.logout();
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
