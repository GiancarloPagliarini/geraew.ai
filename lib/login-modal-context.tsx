'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface LoginModalContextValue {
  isOpen: boolean;
  planParam: string | null;
  openLoginModal: (planParam?: string) => void;
  closeLoginModal: () => void;
}

const LoginModalContext = createContext<LoginModalContextValue | null>(null);

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [planParam, setPlanParam] = useState<string | null>(null);

  function openLoginModal(plan?: string) {
    setPlanParam(plan ?? null);
    setIsOpen(true);
  }

  function closeLoginModal() {
    setIsOpen(false);
    setPlanParam(null);
  }

  return (
    <LoginModalContext.Provider value={{ isOpen, planParam, openLoginModal, closeLoginModal }}>
      {children}
    </LoginModalContext.Provider>
  );
}

export function useLoginModal() {
  const ctx = useContext(LoginModalContext);
  if (!ctx) throw new Error('useLoginModal must be used within LoginModalProvider');
  return ctx;
}
