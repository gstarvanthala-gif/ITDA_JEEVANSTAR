import { useEffect, useState } from 'react';

import { authApi, setAuthToken } from '../services/api';
import AuthContext from './authContextValue.js';

const TOKEN_STORAGE_KEY = 'microgrow_token';

const getStoredToken = () => {
  const sessionToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  const legacyToken = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (legacyToken) {
    if (!sessionToken) sessionStorage.setItem(TOKEN_STORAGE_KEY, legacyToken);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  return sessionToken || legacyToken || '';
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(getStoredToken);
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
      } catch {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
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
      sessionStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }

    localStorage.removeItem(TOKEN_STORAGE_KEY);
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

  const value = { user, token, loading, login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
