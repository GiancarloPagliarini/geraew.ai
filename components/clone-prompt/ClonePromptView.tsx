'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Check,
  Copy,
  Image as ImageIcon,
  RefreshCw,
  Wand2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/lib/login-modal-context';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

interface CloneResult {
  json: unknown;
  compiledPrompt: string;
}

/** Realça o JSON no padrão do design system: chaves em lime, strings em #cdbfae. */
function HighlightedJson({ value }: { value: unknown }) {
  const raw = JSON.stringify(value, null, 2);
  const parts = raw.split(/("(?:[^"\\]|\\.)*"(?:\s*:)?)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (/^"(?:[^"\\]|\\.)*"\s*:$/.test(part)) {
          return (
            <span key={i} className="text-app-lime">
              {part}
            </span>
          );
        }
        if (part.startsWith('"')) {
          return (
            <span key={i} className="text-[#cdbfae]">
              {part}
            </span>
          );
        }
        return (
          <span key={i} className="text-app-text-2">
            {part}
          </span>
        );
      })}
    </>
  );
}

export function ClonePromptView() {
  const t = useTranslations('home');
  const { user, accessToken } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [imageData, setImageData] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CloneResult | null>(null);
  const [mode, setMode] = useState<'string' | 'json'>('string');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(t('clone.invalidFormat'));
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error(t('clone.tooLarge', { max: 5 }));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImageData(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    },
    [t],
  );

  const analyze = async () => {
    if (!imageData || loading) return;
    if (!user || !accessToken) {
      openLoginModal({ mode: 'login' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await api.promptAgent.analyzeImage(accessToken, imageData);
      setResult(data);
      setMode('string');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('clone.failed'));
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    if (!result) return;
    const text =
      mode === 'string' ? result.compiledPrompt : JSON.stringify(result.json, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const useInGenerator = result
    ? `/workspace?${new URLSearchParams({ prompt: result.compiledPrompt, panel: 'generate-image' }).toString()}`
    : '#';

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* painel esquerdo — upload */}
      <div className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-b border-app-hairline p-6 scrollbar-app lg:w-[380px] lg:border-b-0 lg:border-r">
        <div>
          <h2 className="text-[16px] font-semibold text-app-text">{t('clone.uploadTitle')}</h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-app-text-2">
            {t('clone.uploadSubtitle')}
          </p>
        </div>

        {/* drop-zone / preview */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
        {imageData ? (
          <div className="relative overflow-hidden rounded-[16px] border border-app-hairline bg-app-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageData} alt="" className="max-h-[340px] w-full object-contain" />
            <button
              type="button"
              aria-label={t('clone.remove')}
              onClick={() => {
                setImageData(null);
                setResult(null);
              }}
              className="absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-full bg-[rgba(13,16,17,0.7)] text-app-text-2 backdrop-blur-md transition-colors duration-200 ease-app hover:text-app-text"
            >
              <X className="size-4" strokeWidth={1.8} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className={cn(
              'flex h-[300px] w-full flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-dashed bg-app-surface/40 transition-colors duration-200 ease-app',
              dragOver
                ? 'border-[rgba(162,221,0,0.6)] bg-[rgba(162,221,0,0.05)]'
                : 'border-app-hairline-2 hover:border-[rgba(162,221,0,0.4)]',
            )}
          >
            <ImageIcon className="size-7 text-app-muted" strokeWidth={1.5} />
            <span className="px-6 text-center text-[13.5px] font-semibold text-app-text-2">
              {t('clone.dropzone')}
            </span>
            <span className="text-[12px] text-app-muted">{t('clone.browse')}</span>
          </button>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={analyze}
          disabled={!imageData || loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-app-lime text-[14.5px] font-semibold text-app-lime-ink transition-colors duration-200 ease-app hover:bg-app-lime-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="size-[17px] animate-spin" strokeWidth={2} />
              {t('clone.analyzing')}
            </>
          ) : (
            <>
              <Wand2 className="size-[17px]" strokeWidth={2} />
              {t('clone.cta')}
            </>
          )}
        </button>

        <p className="text-[12px] leading-relaxed text-app-muted">{t('clone.tip')}</p>
      </div>

      {/* painel direito — resultado */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <Copy className="size-[17px] text-app-lime" strokeWidth={1.8} />
          <h2 className="text-[16px] font-semibold text-app-text">{t('clone.resultTitle')}</h2>

          {/* segmented String/JSON */}
          {result && (
            <div className="ml-auto flex rounded-[10px] border border-app-hairline bg-app-bg p-1">
              {(['string', 'json'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    'rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-colors duration-200 ease-app',
                    mode === m ? 'bg-app-surface text-app-text' : 'text-app-muted hover:text-app-text-2',
                  )}
                >
                  {t(`clone.${m}`)}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          /* skeleton do resultado */
          <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-[14px] border border-app-hairline bg-app-deep p-5">
            {[80, 95, 70, 88, 60].map((w, i) => (
              <div
                key={i}
                className="h-3.5 animate-pulse rounded bg-app-surface"
                style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
        ) : !result ? (
          /* estado vazio */
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
            <span className="flex size-[64px] items-center justify-center rounded-[16px] border border-app-hairline bg-app-surface">
              <Copy className="size-7 text-app-text-2" strokeWidth={1.6} />
            </span>
            <p className="text-[16px] font-bold text-app-text">{t('clone.emptyTitle')}</p>
            <p className="max-w-[340px] text-[13.5px] leading-relaxed text-app-text-2">
              {t('clone.emptyHint')}
            </p>
          </div>
        ) : (
          <>
            {/* code box */}
            <div className="min-h-0 flex-1 overflow-y-auto rounded-[14px] border border-app-hairline bg-app-deep p-5 scrollbar-app">
              <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed">
                {mode === 'string' ? (
                  <span className="text-app-lime">{result.compiledPrompt}</span>
                ) : (
                  <HighlightedJson value={result.json} />
                )}
              </pre>
            </div>

            {/* ações */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={copyResult}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-app-lime text-[14.5px] font-semibold text-app-lime-ink transition-colors duration-200 ease-app hover:bg-app-lime-hover"
              >
                {copied ? (
                  <>
                    <Check className="size-[17px]" strokeWidth={2} />
                    {t('clone.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="size-[17px]" strokeWidth={1.8} />
                    {mode === 'string' ? t('clone.copyText') : t('clone.copyJson')}
                  </>
                )}
              </button>
              <Link
                href={useInGenerator}
                className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-app-hairline-2 bg-app-surface px-5 text-[14px] font-semibold text-app-text transition-colors duration-200 ease-app hover:bg-app-card-hover"
              >
                <ImageIcon className="size-[16px]" strokeWidth={1.8} />
                {t('clone.useImage')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
