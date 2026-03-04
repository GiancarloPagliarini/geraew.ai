'use client';

import { Canvas } from '@/components/canvas/Canvas';
import { LeftSidebar } from '@/components/editor/LeftSidebar';
import { RightSidebar } from '@/components/editor/RightSidebar';
import { TopNavbar } from '@/components/editor/TopNavbar';
import { EditorProvider } from '@/lib/editor-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('geraew-auth') !== 'true') {
      router.push('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1a2123]">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo_2.svg"
            alt="Geraew AI"
            width={64}
            height={64}
            className="rounded-md mix-blend-lighten animate-pulse"
          />
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a2dd00]/30 border-t-[#a2dd00]" />
        </div>
      </div>
    );
  }

  return (
    <EditorProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-[#1a2123]">
        <TopNavbar />
        <div className="flex flex-1 overflow-hidden">
          <LeftSidebar />
          <Canvas />
          <RightSidebar />
        </div>
      </div>
    </EditorProvider>
  );
}
