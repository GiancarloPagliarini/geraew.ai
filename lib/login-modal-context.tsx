'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LoginModalContextValue {
  isOpen: boolean;
  planParam: string | null;
  initialMode: 'login' | 'register';
  openLoginModal: (opts?: { plan?: string; mode?: 'login' | 'register' }) => void;
  closeLoginModal: () => void;
}

const LoginModalContext = createContext<LoginModalContextValue | null>(null);

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [planParam, setPlanParam] = useState<string | null>(null);
  const [initialMode, setInitialMode] = useState<'login' | 'register'>('login');

  const openLoginModal = useCallback((opts?: { plan?: string; mode?: 'login' | 'register' }) => {
    setPlanParam(opts?.plan ?? null);
    setInitialMode(opts?.mode ?? 'login');
    setIsOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setIsOpen(false);
    setPlanParam(null);
    setInitialMode('login');
  }, []);

  return (
    <LoginModalContext.Provider value={{ isOpen, planParam, initialMode, openLoginModal, closeLoginModal }}>
      {children}
    </LoginModalContext.Provider>
  );
}

export function useLoginModal() {
  const ctx = useContext(LoginModalContext);
  if (!ctx) throw new Error('useLoginModal must be used within LoginModalProvider');
  return ctx;
}
