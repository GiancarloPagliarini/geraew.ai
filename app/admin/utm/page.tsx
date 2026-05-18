'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Link2, Plus, Trash2, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';

type SavedLink = {
  id: string;
  label: string;
  url: string;
  createdAt: number;
};

type FormState = {
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
};

const EMPTY_FORM: FormState = {
  baseUrl: 'https://geraew.ai',
  source: '',
  medium: '',
  campaign: '',
  content: '',
  term: '',
};

const SOURCE_PRESETS = [
  'instagram',
  'tiktok',
  'manychat',
  'youtube',
  'facebook',
  'twitter',
  'whatsapp',
  'email',
  'kwai',
  'linkedin',
];

const MEDIUM_PRESETS = [
  'bio',
  'story',
  'post',
  'reels',
  'dm',
  'broadcast',
  'organic',
  'paid',
  'cpc',
  'email',
];

const BASE_PRESETS = [
  { label: 'Home', value: 'https://geraew.ai' },
  { label: 'Login', value: 'https://geraew.ai/login' },
  { label: 'Checkout', value: 'https://geraew.ai/checkout' },
];

const STORAGE_KEY = 'admin:utm-saved-links';

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildUtmUrl(form: FormState): { url: string; error: string | null } {
  if (!form.baseUrl.trim()) {
    return { url: '', error: 'Informe a URL base.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(form.baseUrl.trim());
  } catch {
    return { url: '', error: 'URL base inválida. Inclua https://' };
  }

  const params = new URLSearchParams(parsed.search);

  const entries: Array<[string, string]> = [
    ['utm_source', form.source],
    ['utm_medium', form.medium],
    ['utm_campaign', form.campaign],
    ['utm_content', form.content],
    ['utm_term', form.term],
  ];

  for (const [key, value] of entries) {
    const v = slugify(value);
    if (v) params.set(key, v);
    else params.delete(key);
  }

  parsed.search = params.toString();
  return { url: parsed.toString(), error: null };
}

export default function UtmBuilderPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [savedLinks, setSavedLinks] = useState<SavedLink[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedLinks(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!copiedField) return;
    const timer = setTimeout(() => setCopiedField(null), 1500);
    return () => clearTimeout(timer);
  }, [copiedField]);

  const { url: generatedUrl, error } = useMemo(() => buildUtmUrl(form), [form]);

  const hasMinimum = form.source.trim() && form.medium.trim() && form.campaign.trim();

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function persistLinks(next: SavedLink[]) {
    setSavedLinks(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  async function copy(text: string, fieldId: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      toast.success('Copiado!');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  }

  function handleSave() {
    if (error || !generatedUrl) {
      toast.error(error ?? 'URL inválida');
      return;
    }
    if (!hasMinimum) {
      toast.error('Preencha source, medium e campaign.');
      return;
    }
    const label = [form.source, form.medium, form.campaign]
      .map((p) => slugify(p))
      .filter(Boolean)
      .join(' · ');

    const entry: SavedLink = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label,
      url: generatedUrl,
      createdAt: Date.now(),
    };
    persistLinks([entry, ...savedLinks].slice(0, 50));
    toast.success('Link salvo.');
  }

  function handleDelete(id: string) {
    persistLinks(savedLinks.filter((l) => l.id !== id));
  }

  function handleReset() {
    setForm(EMPTY_FORM);
  }

  function loadIntoForm(url: string) {
    try {
      const parsed = new URL(url);
      const sp = parsed.searchParams;
      setForm({
        baseUrl: `${parsed.origin}${parsed.pathname}`,
        source: sp.get('utm_source') ?? '',
        medium: sp.get('utm_medium') ?? '',
        campaign: sp.get('utm_campaign') ?? '',
        content: sp.get('utm_content') ?? '',
        term: sp.get('utm_term') ?? '',
      });
      toast.success('Carregado no formulário.');
    } catch {
      toast.error('URL inválida.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#a2dd00]/15">
          <Link2 className="h-5 w-5 text-[#a2dd00]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#f3f0ed]">UTM Builder</h1>
          <p className="mt-0.5 text-sm text-[#f3f0ed]/40">
            Gere URLs com parâmetros UTM para Instagram, TikTok, ManyChat e outras origens.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-[#f3f0ed]/6 bg-[#141a1c] p-5 md:p-6">
          <div className="flex flex-col gap-5">
            <Field
              label="URL Base"
              hint="A página de destino. Ex.: https://geraew.ai/checkout"
              required
            >
              <Input
                value={form.baseUrl}
                onChange={(e) => setField('baseUrl', e.target.value)}
                placeholder="https://geraew.ai"
                className="bg-[#0f1314] border-[#f3f0ed]/10 text-[#f3f0ed]"
              />
              <PresetRow
                items={BASE_PRESETS.map((p) => p.label)}
                onSelect={(label) => {
                  const preset = BASE_PRESETS.find((p) => p.label === label);
                  if (preset) setField('baseUrl', preset.value);
                }}
                active={BASE_PRESETS.find((p) => p.value === form.baseUrl)?.label}
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Source"
                hint="De onde vem o tráfego. Ex.: instagram, tiktok"
                required
              >
                <Input
                  value={form.source}
                  onChange={(e) => setField('source', e.target.value)}
                  placeholder="instagram"
                  className="bg-[#0f1314] border-[#f3f0ed]/10 text-[#f3f0ed]"
                />
                <PresetRow
                  items={SOURCE_PRESETS}
                  onSelect={(v) => setField('source', v)}
                  active={slugify(form.source)}
                />
              </Field>

              <Field
                label="Medium"
                hint="Tipo de mídia. Ex.: bio, story, paid"
                required
              >
                <Input
                  value={form.medium}
                  onChange={(e) => setField('medium', e.target.value)}
                  placeholder="bio"
                  className="bg-[#0f1314] border-[#f3f0ed]/10 text-[#f3f0ed]"
                />
                <PresetRow
                  items={MEDIUM_PRESETS}
                  onSelect={(v) => setField('medium', v)}
                  active={slugify(form.medium)}
                />
              </Field>
            </div>

            <Field
              label="Campaign"
              hint="Nome da campanha. Ex.: lancamento_maio, promo_black"
              required
            >
              <Input
                value={form.campaign}
                onChange={(e) => setField('campaign', e.target.value)}
                placeholder="lancamento_maio"
                className="bg-[#0f1314] border-[#f3f0ed]/10 text-[#f3f0ed]"
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Content (opcional)"
                hint="Diferencia variantes. Ex.: cta_topo, criativo_v2"
              >
                <Input
                  value={form.content}
                  onChange={(e) => setField('content', e.target.value)}
                  placeholder="cta_topo"
                  className="bg-[#0f1314] border-[#f3f0ed]/10 text-[#f3f0ed]"
                />
              </Field>

              <Field
                label="Term (opcional)"
                hint="Palavra-chave / segmentação"
              >
                <Input
                  value={form.term}
                  onChange={(e) => setField('term', e.target.value)}
                  placeholder="ia_para_criadores"
                  className="bg-[#0f1314] border-[#f3f0ed]/10 text-[#f3f0ed]"
                />
              </Field>
            </div>

            <div className="rounded-xl border border-[#f3f0ed]/6 bg-[#0f1314] p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-[#f3f0ed]/40">
                  URL Gerada
                </span>
                {!hasMinimum && (
                  <span className="text-[11px] text-[#f3f0ed]/30">
                    Preencha source, medium e campaign.
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div className="min-h-[44px] break-all rounded-lg border border-[#f3f0ed]/8 bg-[#0a0d0e] p-3 font-mono text-[13px] text-[#a2dd00]">
                  {error ? (
                    <span className="text-red-400">{error}</span>
                  ) : generatedUrl ? (
                    generatedUrl
                  ) : (
                    <span className="text-[#f3f0ed]/30">A URL aparecerá aqui…</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copy(generatedUrl, 'main')}
                    disabled={!generatedUrl || !!error}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#a2dd00] px-4 py-2 text-sm font-semibold text-[#0a0d0e] transition-colors hover:bg-[#b6f00f] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {copiedField === 'main' ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar URL
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!generatedUrl || !!error || !hasMinimum}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#f3f0ed]/10 px-4 py-2 text-sm font-medium text-[#f3f0ed]/80 transition-colors hover:border-[#f3f0ed]/20 hover:text-[#f3f0ed] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                    Salvar link
                  </button>

                  {generatedUrl && !error && (
                    <a
                      href={generatedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-[#f3f0ed]/10 px-4 py-2 text-sm font-medium text-[#f3f0ed]/60 transition-colors hover:border-[#f3f0ed]/20 hover:text-[#f3f0ed]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleReset}
                    className="ml-auto text-xs text-[#f3f0ed]/40 underline-offset-4 hover:text-[#f3f0ed]/70 hover:underline"
                  >
                    Limpar formulário
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-[#f3f0ed]/6 bg-[#141a1c] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#f3f0ed]">Links salvos</h2>
            <span className="text-[11px] text-[#f3f0ed]/40">
              {savedLinks.length}/50
            </span>
          </div>

          {savedLinks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#f3f0ed]/8 p-4 text-center text-xs text-[#f3f0ed]/30">
              Os links que você salvar ficam aqui (salvos só neste navegador).
            </p>
          ) : (
            <ul className="flex max-h-[640px] flex-col gap-2 overflow-y-auto pr-1">
              {savedLinks.map((link) => (
                <li
                  key={link.id}
                  className="group rounded-xl border border-[#f3f0ed]/6 bg-[#0f1314] p-3 transition-colors hover:border-[#f3f0ed]/12"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="line-clamp-1 text-xs font-medium text-[#f3f0ed]/80">
                      {link.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(link.id)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-[#f3f0ed]/40 hover:text-red-400" />
                    </button>
                  </div>
                  <p className="mt-1.5 line-clamp-2 break-all font-mono text-[11px] text-[#f3f0ed]/40">
                    {link.url}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => copy(link.url, link.id)}
                      className="inline-flex items-center gap-1 rounded-md bg-[#a2dd00]/10 px-2 py-1 text-[11px] font-medium text-[#a2dd00] transition-colors hover:bg-[#a2dd00]/20"
                    >
                      {copiedField === link.id ? (
                        <>
                          <Check className="h-3 w-3" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copiar
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => loadIntoForm(link.url)}
                      className="rounded-md border border-[#f3f0ed]/8 px-2 py-1 text-[11px] text-[#f3f0ed]/50 transition-colors hover:border-[#f3f0ed]/15 hover:text-[#f3f0ed]/80"
                    >
                      Editar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-[#f3f0ed]/70">
          {label}
        </label>
        {required && <span className="text-[10px] text-[#a2dd00]">obrigatório</span>}
      </div>
      {children}
      {hint && <p className="text-[11px] text-[#f3f0ed]/35">{hint}</p>}
    </div>
  );
}

function PresetRow({
  items,
  onSelect,
  active,
}: {
  items: string[];
  onSelect: (value: string) => void;
  active?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const isActive = active === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              isActive
                ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
                : 'bg-[#f3f0ed]/4 text-[#f3f0ed]/50 hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80'
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
