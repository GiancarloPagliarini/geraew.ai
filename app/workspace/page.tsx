'use client';

import { Canvas } from '@/components/canvas/Canvas';
import { LeftSidebar } from '@/components/editor/LeftSidebar';
import dynamic from 'next/dynamic';
const OnboardingTour = dynamic(() => import('@/components/editor/OnboardingTour').then(m => m.OnboardingTour), { ssr: false });
import { RightSidebar } from '@/components/editor/RightSidebar';
import { TopNavbar } from '@/components/editor/TopNavbar';
import { EditorProvider } from '@/lib/editor-context';
import { InfluencerBuilderProvider } from '@/lib/influencer-builder-context';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/lib/login-modal-context';

function RegisterModalTrigger() {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { openLoginModal } = useLoginModal();
  const triggered = useRef(false);

  useEffect(() => {
    if (loading || triggered.current) return;
    if (!user && searchParams.get('register') === 'true') {
      triggered.current = true;
      openLoginModal({ mode: 'register' });
    }
  }, [loading, user, searchParams, openLoginModal]);

  return null;
}

export default function Home() {
  return (
    <EditorProvider>
      <InfluencerBuilderProvider>
        <div className="flex h-screen flex-col overflow-hidden bg-[#1a2123]">
          <TopNavbar />
          <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
            <LeftSidebar />
            <div className="flex flex-1 overflow-hidden">
              <Canvas />
              <RightSidebar />
            </div>
          </div>
        </div>
        <OnboardingTour />
        <Suspense><RegisterModalTrigger /></Suspense>
      </InfluencerBuilderProvider>
    </EditorProvider>
  );
}
