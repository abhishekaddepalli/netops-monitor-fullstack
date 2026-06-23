import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/auth';
import { apiErrorMessage } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('netops_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      setUser(data.user);
      setOrganization(data.user.organization ?? null);
      setRole(data.role);
    } catch {
      localStorage.removeItem('netops_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();

    // Fired by the axios interceptor in api/client.js on any 401 response.
    const handleUnauthorized = () => {
      setUser(null);
      setOrganization(null);
      setRole(null);
    };
    window.addEventListener('netops:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('netops:unauthorized', handleUnauthorized);
  }, [loadCurrentUser]);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await authApi.login({ email, password });
      localStorage.setItem('netops_token', data.token);
      setUser(data.user);
      setOrganization(data.user.organization ?? null);
      setRole(data.user.system_role === 'super_admin' ? 'super_admin' : null);
      await loadCurrentUser();
      return { success: true };
    } catch (error) {
      return { success: false, message: apiErrorMessage(error, 'Invalid email or password.') };
    }
  }, [loadCurrentUser]);

  const register = useCallback(async (payload) => {
    try {
      const { data } = await authApi.register(payload);
      localStorage.setItem('netops_token', data.token);
      setUser(data.user);
      setOrganization(data.organization);
      setRole('org_admin');
      return { success: true };
    } catch (error) {
      return { success: false, message: apiErrorMessage(error, 'Registration failed.') };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Token may already be invalid server-side — clear local state regardless.
    }
    localStorage.removeItem('netops_token');
    setUser(null);
    setOrganization(null);
    setRole(null);
  }, []);

  const isSuperAdmin = user?.system_role === 'super_admin';
  const isOrgAdmin = role === 'org_admin' || isSuperAdmin;
  const isOperatorOrAbove = ['org_admin', 'operator'].includes(role) || isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        user, organization, role, loading,
        isSuperAdmin, isOrgAdmin, isOperatorOrAbove,
        login, register, logout, refresh: loadCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
