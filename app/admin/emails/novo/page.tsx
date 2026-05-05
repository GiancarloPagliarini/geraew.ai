'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Send,
  TestTube2,
  AlertTriangle,
  Mail,
  Users,
  UserRound,
  ListChecks,
  CreditCard,
  Tag,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

type RecipientType = 'ALL' | 'ALL_PAID' | 'BY_PLAN' | 'CUSTOM_LIST' | 'SINGLE';

const MERGE_TAGS = [
  { key: 'name', label: 'Nome completo', tag: '{{name}}' },
  { key: 'firstName', label: 'Primeiro nome', tag: '{{firstName}}' },
  { key: 'email', label: 'Email', tag: '{{email}}' },
  { key: 'plan', label: 'Plano', tag: '{{plan}}' },
];

const PLANS = [
  { slug: 'free', label: 'Free' },
  { slug: 'ultra-basic', label: 'Ultra Basic' },
  { slug: 'starter', label: 'Starter (legacy)' },
  { slug: 'basic', label: 'Basic' },
  { slug: 'creator', label: 'Creator (legacy)' },
  { slug: 'pro', label: 'Pro (legacy)' },
  { slug: 'advanced', label: 'Advanced' },
  { slug: 'studio', label: 'Studio (legacy)' },
];

export default function NewEmailBroadcastPage() {
  const { accessToken, user } = useAuth();
  const router = useRouter();

  // ─── Refs pra inserir merge tags no campo focado ─────────────
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocusedRef = useRef<'subject' | 'body'>('body');

  // Dados do admin pra usar como exemplo no preview
  const previewMergeVars = useMemo(() => {
    const fullName = user?.name ?? '';
    const firstName = fullName.split(/\s+/)[0] ?? '';
    return {
      name: fullName,
      firstName,
      email: user?.email ?? '',
      plan: '', // admin geralmente não tem plano pago — fica vazio
    };
  }, [user]);

  const [subject, setSubject] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState(`# Olá!\n\nEscreva sua mensagem aqui em **markdown**.\n\n- Item 1\n- Item 2\n\n[Link de exemplo](https://geraew.com.br)`);
  const [recipientType, setRecipientType] = useState<RecipientType>('BY_PLAN');
  const [planSlug, setPlanSlug] = useState('pro');
  const [emailsRaw, setEmailsRaw] = useState('');
  const [singleEmail, setSingleEmail] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const recipientFilter = useMemo(() => {
    switch (recipientType) {
      case 'BY_PLAN':
        return { planSlug };
      case 'CUSTOM_LIST': {
        const emails = emailsRaw
          .split(/[\n,;]/)
          .map((e) => e.trim())
          .filter(Boolean);
        return { emails };
      }
      case 'SINGLE':
        return { email: singleEmail };
      case 'ALL':
      default:
        return undefined;
    }
  }, [recipientType, planSlug, emailsRaw, singleEmail]);

  // ─── Preview da contagem (com debounce de 400ms) ───────────────────
  const [countQueryKey, setCountQueryKey] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setCountQueryKey((n) => n + 1), 400);
    return () => clearTimeout(t);
  }, [recipientType, planSlug, emailsRaw, singleEmail]);

  const countQuery = useQuery({
    queryKey: ['admin', 'emails', 'preview-count', countQueryKey],
    queryFn: () =>
      api.adminEmails.previewCount(accessToken!, { recipientType, recipientFilter }),
    enabled:
      !!accessToken &&
      // só busca se o filtro tem dados suficientes
      (recipientType === 'ALL' ||
        recipientType === 'ALL_PAID' ||
        (recipientType === 'BY_PLAN' && !!planSlug) ||
        (recipientType === 'CUSTOM_LIST' && !!recipientFilter?.emails?.length) ||
        (recipientType === 'SINGLE' && !!singleEmail.trim())),
    retry: false,
  });

  // ─── Preview do HTML (debounce 600ms) ──────────────────────────────
  const [htmlQueryKey, setHtmlQueryKey] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setHtmlQueryKey((n) => n + 1), 600);
    return () => clearTimeout(t);
  }, [bodyMarkdown, subject, previewMergeVars]);

  const htmlPreview = useQuery({
    queryKey: ['admin', 'emails', 'render-preview', htmlQueryKey],
    queryFn: () =>
      api.adminEmails.renderPreview(accessToken!, {
        bodyMarkdown,
        subject,
        mergeVars: previewMergeVars,
      }),
    enabled: !!accessToken && bodyMarkdown.length >= 1,
    retry: false,
  });

  // ─── Inserção de merge tag no campo focado ─────────────────────────
  function insertMergeTag(tag: string) {
    const target = lastFocusedRef.current;
    const el =
      target === 'subject' ? subjectRef.current : bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const value = el.value;
    const newValue = value.slice(0, start) + tag + value.slice(end);
    if (target === 'subject') {
      setSubject(newValue);
    } else {
      setBodyMarkdown(newValue);
    }
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + tag.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  // ─── Mutations ─────────────────────────────────────────────────────
  const sendTestMutation = useMutation({
    mutationFn: () =>
      api.adminEmails.sendTest(accessToken!, { subject, bodyMarkdown }),
    onSuccess: (data) => {
      toast.success(`Email de teste enviado pra ${data.sentTo}`);
    },
    onError: (err: any) => {
      toast.error(err.message ?? 'Falha ao enviar teste');
    },
  });

  const sendBroadcastMutation = useMutation({
    mutationFn: () =>
      api.adminEmails.send(accessToken!, {
        subject,
        bodyMarkdown,
        recipientType,
        recipientFilter,
      }),
    onSuccess: (data) => {
      toast.success(`Broadcast enfileirado — ${data.totalRecipients} destinatários`);
      router.push(`/admin/emails/${data.id}`);
    },
    onError: (err: any) => {
      toast.error(err.message ?? 'Falha ao disparar broadcast');
      setConfirmOpen(false);
    },
  });

  const canSubmit =
    subject.trim().length >= 3 &&
    bodyMarkdown.trim().length >= 10 &&
    !!countQuery.data?.count &&
    countQuery.data.count > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/emails"
          className="rounded-lg p-2 text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]"
          title="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-[#f3f0ed]">Novo email</h1>
          <p className="text-sm text-[#f3f0ed]/50">
            Compõe e dispara um broadcast pros usuários.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Coluna esquerda: formulário ─────────────────── */}
        <div className="space-y-5">
          {/* Destinatários */}
          <section className="rounded-2xl border border-[#f3f0ed]/6 bg-[#141a1c] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#f3f0ed]">
              <Users className="h-4 w-4 text-[#a2dd00]" />
              Destinatários
            </h2>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {[
                { type: 'ALL' as const, label: 'Todos', icon: Users },
                { type: 'ALL_PAID' as const, label: 'Pagantes', icon: CreditCard },
                { type: 'BY_PLAN' as const, label: 'Por plano', icon: ListChecks },
                { type: 'CUSTOM_LIST' as const, label: 'Lista', icon: Mail },
                { type: 'SINGLE' as const, label: 'Único', icon: UserRound },
              ].map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRecipientType(type)}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    recipientType === type
                      ? 'border-[#a2dd00] bg-[#a2dd00]/10 text-[#a2dd00]'
                      : 'border-[#f3f0ed]/10 text-[#f3f0ed]/70 hover:border-[#f3f0ed]/20'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {recipientType === 'BY_PLAN' && (
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium text-[#f3f0ed]/60">
                  Plano
                </label>
                <select
                  value={planSlug}
                  onChange={(e) => setPlanSlug(e.target.value)}
                  className="w-full rounded-lg border border-[#f3f0ed]/10 bg-[#111618] px-3 py-2 text-sm text-[#f3f0ed] outline-none focus:border-[#a2dd00]"
                >
                  {PLANS.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {recipientType === 'CUSTOM_LIST' && (
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium text-[#f3f0ed]/60">
                  Lista de emails (separe por vírgula, ponto-e-vírgula ou quebra de linha)
                </label>
                <textarea
                  value={emailsRaw}
                  onChange={(e) => setEmailsRaw(e.target.value)}
                  rows={4}
                  placeholder="user1@example.com, user2@example.com"
                  className="w-full rounded-lg border border-[#f3f0ed]/10 bg-[#111618] px-3 py-2 text-sm text-[#f3f0ed] outline-none focus:border-[#a2dd00]"
                />
              </div>
            )}

            {recipientType === 'SINGLE' && (
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium text-[#f3f0ed]/60">
                  Email do destinatário
                </label>
                <input
                  type="email"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  placeholder="usuario@example.com"
                  className="w-full rounded-lg border border-[#f3f0ed]/10 bg-[#111618] px-3 py-2 text-sm text-[#f3f0ed] outline-none focus:border-[#a2dd00]"
                />
              </div>
            )}

            <div className="mt-4 rounded-lg border border-[#f3f0ed]/6 bg-[#111618] px-4 py-3 text-sm">
              {countQuery.isFetching ? (
                <span className="text-[#f3f0ed]/50">Calculando...</span>
              ) : countQuery.error ? (
                <span className="text-red-400">Filtro inválido</span>
              ) : countQuery.data ? (
                <span className="text-[#f3f0ed]">
                  Vai disparar para{' '}
                  <strong className="text-[#a2dd00]">
                    {countQuery.data.count.toLocaleString('pt-BR')}
                  </strong>{' '}
                  {countQuery.data.count === 1 ? 'pessoa' : 'pessoas'}
                </span>
              ) : (
                <span className="text-[#f3f0ed]/50">Selecione um filtro</span>
              )}
            </div>
          </section>

          {/* Conteúdo */}
          <section className="rounded-2xl border border-[#f3f0ed]/6 bg-[#141a1c] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#f3f0ed]">
              <Mail className="h-4 w-4 text-[#a2dd00]" />
              Conteúdo
            </h2>

            <label className="mb-1.5 block text-xs font-medium text-[#f3f0ed]/60">
              Assunto
            </label>
            <input
              ref={subjectRef}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => (lastFocusedRef.current = 'subject')}
              maxLength={200}
              placeholder="Ex: {{firstName}}, sua capacidade triplicou"
              className="mb-4 w-full rounded-lg border border-[#f3f0ed]/10 bg-[#111618] px-3 py-2 text-sm text-[#f3f0ed] outline-none focus:border-[#a2dd00]"
            />

            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-[#f3f0ed]/60">
                Corpo (Markdown)
              </label>
              <a
                href="https://www.markdownguide.org/cheat-sheet/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#a2dd00]/70 hover:text-[#a2dd00]"
              >
                Cheat sheet
              </a>
            </div>
            <textarea
              ref={bodyRef}
              value={bodyMarkdown}
              onChange={(e) => setBodyMarkdown(e.target.value)}
              onFocus={() => (lastFocusedRef.current = 'body')}
              rows={16}
              maxLength={50_000}
              className="w-full rounded-lg border border-[#f3f0ed]/10 bg-[#111618] px-3 py-2 font-mono text-sm text-[#f3f0ed] outline-none focus:border-[#a2dd00]"
            />
            <p className="mt-1 text-xs text-[#f3f0ed]/40">
              {bodyMarkdown.length} / 50.000 caracteres
            </p>

            {/* ─── Toolbar de merge tags ─── */}
            <div className="mt-4 rounded-lg border border-[#f3f0ed]/6 bg-[#111618] p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#f3f0ed]/40">
                <Tag className="h-3 w-3" />
                Inserir variável
              </div>
              <div className="flex flex-wrap gap-2">
                {MERGE_TAGS.map((mt) => (
                  <button
                    key={mt.key}
                    type="button"
                    onClick={() => insertMergeTag(mt.tag)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#f3f0ed]/10 bg-[#141a1c] px-2.5 py-1 text-xs text-[#f3f0ed]/80 transition-colors hover:border-[#a2dd00]/40 hover:text-[#a2dd00]"
                    title={mt.label}
                  >
                    <code className="font-mono text-[11px]">{mt.tag}</code>
                    <span className="text-[#f3f0ed]/40">·</span>
                    <span>{mt.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[#f3f0ed]/40">
                Funciona no assunto e no corpo. Clique no campo desejado antes de inserir.
                Sem valor → string vazia.
              </p>
            </div>
          </section>

          {/* Ações */}
          <section className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!subject.trim() || !bodyMarkdown.trim() || sendTestMutation.isPending}
              onClick={() => sendTestMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-lg border border-[#f3f0ed]/15 bg-[#141a1c] px-4 py-2 text-sm font-medium text-[#f3f0ed] transition-colors hover:bg-[#f3f0ed]/5 disabled:opacity-40 disabled:hover:bg-[#141a1c]"
            >
              {sendTestMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube2 className="h-4 w-4" />
              )}
              Enviar teste pra mim
            </button>

            <button
              type="button"
              disabled={!canSubmit || sendBroadcastMutation.isPending}
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#a2dd00] px-4 py-2 text-sm font-semibold text-[#111618] transition-colors hover:bg-[#a2dd00]/90 disabled:opacity-40 disabled:hover:bg-[#a2dd00]"
            >
              <Send className="h-4 w-4" />
              Enviar broadcast
            </button>
          </section>
        </div>

        {/* ── Coluna direita: preview ─────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#141a1c] p-5">
            <h2 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Preview</h2>
            <div className="overflow-hidden rounded-lg border border-[#f3f0ed]/6 bg-white">
              {htmlPreview.isFetching && !htmlPreview.data ? (
                <div className="flex h-96 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
                </div>
              ) : htmlPreview.error ? (
                <div className="p-6 text-sm text-red-500">
                  Erro ao renderizar preview.
                </div>
              ) : (
                <iframe
                  srcDoc={htmlPreview.data?.html ?? ''}
                  title="Preview do email"
                  className="h-[800px] w-full border-0"
                  sandbox=""
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal de confirmação ─────────────────────────── */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#f3f0ed]/10 bg-[#141a1c] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-yellow-500/15 p-2">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <h3 className="text-base font-semibold text-[#f3f0ed]">
                Confirmar disparo
              </h3>
            </div>
            <p className="mb-2 text-sm text-[#f3f0ed]/70">
              Vai enviar este email para{' '}
              <strong className="text-[#a2dd00]">
                {countQuery.data?.count.toLocaleString('pt-BR')}{' '}
                {countQuery.data?.count === 1 ? 'pessoa' : 'pessoas'}
              </strong>
              .
            </p>
            <p className="mb-5 text-xs text-[#f3f0ed]/50">
              Cota Resend usada neste disparo: {countQuery.data?.count} / 50.000 do mês.
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={sendBroadcastMutation.isPending}
                className="rounded-lg px-4 py-2 text-sm text-[#f3f0ed]/70 hover:bg-[#f3f0ed]/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => sendBroadcastMutation.mutate()}
                disabled={sendBroadcastMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-[#a2dd00] px-4 py-2 text-sm font-semibold text-[#111618] hover:bg-[#a2dd00]/90 disabled:opacity-50"
              >
                {sendBroadcastMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Confirmar disparo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
