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
import type { Edge, Node } from '@xyflow/react';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/lib/login-modal-context';
import { useQuery } from '@tanstack/react-query';
import { api, type WorkspaceContentInput, type WorkspaceDetail } from '@/lib/api';
import { useWorkspaceAutosave } from '@/components/workspaces/use-workspace-autosave';
import { WorkspaceLoading } from '@/components/workspaces/WorkspaceLoading';
import { FeedbackRewardModal } from '@/components/FeedbackRewardModal';

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

/** Abre o formulário de vídeo de avatar quando chega via /workspace?avatarVideo=<id>. */
function AvatarVideoFromQueryTrigger() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { requestAvatarVideoForm } = useEditor();
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    const avatarId = searchParams.get('avatarVideo');
    if (!avatarId || !accessToken) return;
    triggered.current = true;

    (async () => {
      try {
        const avatar = await api.avatars.get(accessToken, avatarId);
        requestAvatarVideoForm({ avatar });
      } catch {
        /* avatar inacessível — ignora */
      }
      const next = new URLSearchParams(searchParams.toString());
      next.delete('avatarVideo');
      const qs = next.toString();
      router.replace(qs ? `/workspace?${qs}` : '/workspace');
    })();
  }, [searchParams, accessToken, requestAvatarVideoForm, router]);

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

function WorkspaceShell({ workspace, onPersist }: {
  workspace: WorkspaceDetail;
  onPersist: (partial: WorkspaceContentInput) => void;
}) {
  const { studioMode } = useEditor();
  return (
    <div
      className={`flex h-screen flex-col overflow-hidden ${studioMode ? 'bg-[#0d1011]' : 'bg-[#1a2123]'}`}
      data-studio-mode={studioMode ? 'on' : 'off'}
    >
      <TopNavbar />
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <LeftSidebar />
        <div className="flex flex-1 overflow-hidden">
          <Canvas
            initial={{
              nodes: (workspace.nodes ?? []) as Node[],
              edges: (workspace.edges ?? []) as Edge[],
              viewport: workspace.viewport ?? null,
            }}
            onPersist={onPersist}
          />
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}

/**
 * O canvas agora é acessado somente pela listagem (/workspaces): carrega o
 * workspace do backend pelo ?id= e redireciona para a listagem sem id válido.
 */
const LOADER_MIN_MS = 4000;

function WorkspaceGate() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const workspaceId = searchParams.get('id');
  const [minTimeDone, setMinTimeDone] = useState(false);

  // a animação de loading fica visível por pelo menos LOADER_MIN_MS
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeDone(true), LOADER_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  const { data, isError } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => api.workspaces.get(accessToken!, workspaceId!),
    enabled: !!accessToken && !!workspaceId,
    // o canvas vira o dono do estado após carregar: nunca refazer a query
    // com a tela aberta (sobrescreveria mudanças locais) nem manter cache
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    if (!workspaceId || isError || (!authLoading && !user)) {
      router.replace('/workspaces');
    }
  }, [workspaceId, isError, authLoading, user, router]);

  const persist = useWorkspaceAutosave(workspaceId, accessToken);

  if (!data || !minTimeDone) {
    return <WorkspaceLoading />;
  }

  return <WorkspaceShell key={workspaceId} workspace={data} onPersist={persist} />;
}

export default function Home() {
  return (
    <EditorProvider>
      <InfluencerBuilderProvider>
        <Suspense fallback={<WorkspaceLoading />}>
          <WorkspaceGate />
        </Suspense>
        <OnboardingTour />
        <SupportButton />
        <Suspense><RegisterModalTrigger /></Suspense>
        <Suspense><PromptFromQueryTrigger /></Suspense>
        <Suspense><AvatarVideoFromQueryTrigger /></Suspense>
        <FeedbackRewardTrigger />
      </InfluencerBuilderProvider>
    </EditorProvider>
  );
}
