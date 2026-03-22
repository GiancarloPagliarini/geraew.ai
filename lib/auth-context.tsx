'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, AuthUser, setRefreshHandler } from './api';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string, phone: string, firebaseToken: string) => Promise<void>;
  googleLogin: (googleToken: string) => Promise<void>;
  logout: () => void;
  loginMutation: ReturnType<typeof useLoginMutation>;
  registerMutation: ReturnType<typeof useRegisterMutation>;
  googleLoginMutation: ReturnType<typeof useGoogleLoginMutation>;
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
    // Clear canvas and panel data from previous session
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('geraew-')) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
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
    mutationFn: ({ email, name, password, phone, firebaseToken }: { email: string; name: string; password: string; phone: string; firebaseToken: string }) =>
      api.auth.register(email, name, password, phone, firebaseToken),
    onSuccess,
  });
}

function useGoogleLoginMutation(onSuccess: (res: Awaited<ReturnType<typeof api.auth.google>>) => void) {
  return useMutation({
    mutationFn: ({ googleToken }: { googleToken: string }) =>
      api.auth.google(googleToken),
    onSuccess,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
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
  const googleLoginMutation = useGoogleLoginMutation(handleAuthSuccess);

  // Register the 401 refresh handler so authRequest can auto-retry
  useEffect(() => {
    setRefreshHandler(async () => {
      const stored = loadAuth();
      if (!stored) {
        clearAuth();
        setState({ user: null, accessToken: null, refreshToken: null, loading: false });
        throw new Error('No refresh token available');
      }
      try {
        const res = await api.auth.refresh(stored.refreshToken);
        saveAuth(res);
        setState({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken, loading: false });
        return res.accessToken;
      } catch {
        clearAuth();
        setState({ user: null, accessToken: null, refreshToken: null, loading: false });
        throw new Error('Session expired');
      }
    });
  }, []);

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
    async (email: string, name: string, password: string, phone: string, firebaseToken: string) => {
      await registerMutation.mutateAsync({ email, name, password, phone, firebaseToken });
    },
    [registerMutation]
  );

  const googleLogin = useCallback(
    async (googleToken: string) => {
      await googleLoginMutation.mutateAsync({ googleToken });
    },
    [googleLoginMutation]
  );

  const logout = useCallback(async () => {
    if (state.refreshToken) {
      api.auth.logout(state.refreshToken).catch(() => {});
    }
    clearAuth();
    queryClient.clear();
    setState({ user: null, accessToken: null, refreshToken: null, loading: false });
  }, [state.refreshToken, queryClient]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, googleLogin, logout, loginMutation, registerMutation, googleLoginMutation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
