'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

/**
 * Loading full-screen do workspace: aurora fluida de fundo (mesmos blobs do
 * GenerationPreview), grid de pontos do canvas, orbe lime pulsando com anéis
 * em contra-rotação e texto com shimmer.
 */
export function WorkspaceLoading() {
  const t = useTranslations('editorChrome.loading');

  return (
    // o fundo escuro entra instantâneo (sem fade) para não vazar o body branco
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#11181a]">
      {/* aurora fluida */}
      <div className="ws-loader-in absolute inset-0" style={{ filter: 'blur(90px)' }}>
        <div
          className="absolute"
          style={{
            top: '-25%', left: '-15%', width: '75%', height: '75%',
            background: 'radial-gradient(ellipse, rgba(162,221,0,0.16) 0%, transparent 70%)',
            animation: 'fluid-blob-1 7s ease-in-out infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: '-20%', right: '-15%', width: '70%', height: '70%',
            background: 'radial-gradient(ellipse, rgba(30,73,75,0.9) 0%, rgba(162,221,0,0.1) 55%, transparent 75%)',
            animation: 'fluid-blob-2 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            top: '10%', right: '-10%', width: '60%', height: '60%',
            background: 'radial-gradient(ellipse, rgba(20,40,38,0.9) 0%, rgba(162,221,0,0.07) 60%, transparent 80%)',
            animation: 'fluid-blob-3 9s ease-in-out infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: '-10%', left: '5%', width: '60%', height: '60%',
            background: 'radial-gradient(ellipse, rgba(162,221,0,0.12) 0%, rgba(26,51,40,0.5) 50%, transparent 75%)',
            animation: 'fluid-blob-4 11s ease-in-out infinite',
          }}
        />
      </div>

      {/* grid de pontos do canvas, esmaecendo nas bordas */}
      <div
        className="ws-loader-in absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(243,240,237,0.09) 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse at center, black 25%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 25%, transparent 72%)',
        }}
      />

      {/* centro: logo + anéis + texto */}
      <div className="ws-loader-in relative flex flex-col items-center gap-8">
        <div className="relative flex size-[104px] items-center justify-center">
          {/* anel externo fino girando */}
          <span className="ws-loader-ring absolute inset-0 rounded-full" />
          {/* anel interno em contra-rotação */}
          <span className="ws-loader-ring-2 absolute inset-[16px] rounded-full" />
          {/* logo no centro */}
          <Image
            src="/logo_2.svg"
            alt=""
            width={58}
            height={58}
            priority
            className="relative"
          />
        </div>
        <p className="ws-loader-text text-[15px] font-semibold tracking-[0.07em]">{t('title')}</p>
      </div>
    </div>
  );
}
