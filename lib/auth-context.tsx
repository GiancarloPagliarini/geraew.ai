'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, AuthUser } from './api';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  loginMutation: ReturnType<typeof useLoginMutation>;
  registerMutation: ReturnType<typeof useRegisterMutation>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

function saveAuth(data: { accessToken: string; refreshToken: string; user: AuthUser }) {
  setCookie('geraew-access-token', data.accessToken);
  setCookie('geraew-refresh-token', data.refreshToken);
  setCookie('geraew-user', JSON.stringify(data.user));
}

function loadAuth(): { accessToken: string; refreshToken: string; user: AuthUser } | null {
  try {
    const accessToken = getCookie('geraew-access-token');
    const refreshToken = getCookie('geraew-refresh-token');
    const userRaw = getCookie('geraew-user');
    if (!accessToken || !refreshToken || !userRaw) return null;
    return { accessToken, refreshToken, user: JSON.parse(userRaw) };
  } catch {
    return null;
  }
}

function clearAuth() {
  deleteCookie('geraew-access-token');
  deleteCookie('geraew-refresh-token');
  deleteCookie('geraew-user');
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('geraew-auth');
    localStorage.removeItem('geraew-auth-data');
  }
}

function useLoginMutation(onSuccess: (res: Awaited<ReturnType<typeof api.auth.login>>) => void) {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.auth.login(email, password),
    onSuccess,
  });
}

function useRegisterMutation(onSuccess: (res: Awaited<ReturnType<typeof api.auth.register>>) => void) {
  return useMutation({
    mutationFn: ({ email, name, password }: { email: string; name: string; password: string }) =>
      api.auth.register(email, name, password),
    onSuccess,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    loading: true,
  });

  const handleAuthSuccess = useCallback((res: { accessToken: string; refreshToken: string; user: AuthUser }) => {
    saveAuth(res);
    setState({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken, loading: false });
  }, []);

  const loginMutation = useLoginMutation(handleAuthSuccess);
  const registerMutation = useRegisterMutation(handleAuthSuccess);

  // Hydrate from cookies on mount
  useEffect(() => {
    const stored = loadAuth();
    if (stored) {
      api.auth
        .refresh(stored.refreshToken)
        .then((res) => {
          saveAuth(res);
          setState({
            user: res.user,
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            loading: false,
          });
        })
        .catch(() => {
          clearAuth();
          setState({ user: null, accessToken: null, refreshToken: null, loading: false });
        });
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      await loginMutation.mutateAsync({ email, password });
    },
    [loginMutation]
  );

  const register = useCallback(
    async (email: string, name: string, password: string) => {
      await registerMutation.mutateAsync({ email, name, password });
    },
    [registerMutation]
  );

  const logout = useCallback(async () => {
    if (state.refreshToken) {
      api.auth.logout(state.refreshToken).catch(() => {});
    }
    clearAuth();
    setState({ user: null, accessToken: null, refreshToken: null, loading: false });
  }, [state.refreshToken]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, loginMutation, registerMutation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
