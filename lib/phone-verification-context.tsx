'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

interface PhoneVerificationContextValue {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const PhoneVerificationContext = createContext<PhoneVerificationContextValue | null>(null);

export function PhoneVerificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Auto-open only on first login (once per user, tracked via localStorage)
  useEffect(() => {
    if (!user || user.phoneVerified || !user.emailVerified || !user.hasCompletedOnboarding) return;
    const key = `geraew-phone-modal-shown-${user.id}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      setOpen(true);
    }
  }, [user]);

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  return (
    <PhoneVerificationContext.Provider value={{ open, openModal, closeModal }}>
      {children}
    </PhoneVerificationContext.Provider>
  );
}

export function usePhoneVerification() {
  const ctx = useContext(PhoneVerificationContext);
  if (!ctx) throw new Error('usePhoneVerification must be used inside PhoneVerificationProvider');
  return ctx;
}
