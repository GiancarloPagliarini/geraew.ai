'use client';

import { Canvas } from '@/components/canvas/Canvas';
import { LeftSidebar } from '@/components/editor/LeftSidebar';
import dynamic from 'next/dynamic';
const OnboardingTour = dynamic(() => import('@/components/editor/OnboardingTour').then(m => m.OnboardingTour), { ssr: false });
import { RightSidebar } from '@/components/editor/RightSidebar';
import { SupportButton } from '@/components/editor/SupportButton';
import { TopNavbar } from '@/components/editor/TopNavbar';
import { EditorProvider, useEditor } from '@/lib/editor-context';
import { InfluencerBuilderProvider } from '@/lib/influencer-builder-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/lib/login-modal-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FeedbackRewardModal } from '@/components/FeedbackRewardModal';
import { AnnouncementsManager } from '@/components/editor/AnnouncementsManager';

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

function PromptFromQueryTrigger() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { requestPanelWithPrompt } = useEditor();
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    const prompt = searchParams.get('prompt');
    if (!prompt) return;
    const panel = searchParams.get('panel') === 'generate-video'
      ? 'generate-video'
      : 'generate-image';

    triggered.current = true;
    requestPanelWithPrompt({ panelType: panel, prompt });

    const next = new URLSearchParams(searchParams.toString());
    next.delete('prompt');
    next.delete('panel');
    const qs = next.toString();
    router.replace(qs ? `/workspace?${qs}` : '/workspace');
  }, [searchParams, requestPanelWithPrompt, router]);

  return null;
}

function FeedbackRewardTrigger() {
  const { user, accessToken } = useAuth();
  const [open, setOpen] = useState(false);
  const triggered = useRef(false);

  const { data: profile } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.me(accessToken!),
    enabled: !!accessToken && !!user,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (triggered.current || !profile || !user) return;
    if (profile.feedbackSubmitted) return;

    const sub = profile.subscription as Record<string, unknown> | null;
    const plan = profile.plan as Record<string, unknown> | null;
    const status = (sub?.status as string | undefined)?.toLowerCase();
    const isActivePaid = status === 'active' && (plan?.slug as string | undefined) !== 'free';
    if (!isActivePaid) return;

    const sessionKey = `geraew-feedback-shown-${user.id}`;
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(sessionKey) === '1') return;

    triggered.current = true;
    sessionStorage.setItem(sessionKey, '1');
    setOpen(true);
  }, [profile, user]);

  const handleClose = () => setOpen(false);

  return <FeedbackRewardModal open={open} onClose={handleClose} />;
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
        <SupportButton />
        <Suspense><RegisterModalTrigger /></Suspense>
        <Suspense><PromptFromQueryTrigger /></Suspense>
        <FeedbackRewardTrigger />
        <AnnouncementsManager />
      </InfluencerBuilderProvider>
    </EditorProvider>
  );
}
