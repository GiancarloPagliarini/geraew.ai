'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { AiModelAdmin } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

function providerBadge(provider: AiModelAdmin['provider']) {
  const colors: Record<string, string> = {
    GERAEW: 'border-[#a2dd00]/30 bg-[#a2dd00]/10 text-[#a2dd00]',
    KIE: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  };
  return (
    <Badge variant="outline" className={colors[provider] ?? 'border-[#f3f0ed]/10 text-[#f3f0ed]/50'}>
      {provider}
    </Badge>
  );
}

function typeBadge(type: AiModelAdmin['type']) {
  return (
    <Badge variant="outline" className="border-[#f3f0ed]/10 text-[#f3f0ed]/50">
      {type}
    </Badge>
  );
}

type CardProps = {
  model: AiModelAdmin;
  onToggle: (input: { id: string; isActive: boolean; statusMessage?: string }) => void;
  isPending: boolean;
};

function ModelCard({ model, onToggle, isPending }: CardProps) {
  const [statusMessage, setStatusMessage] = useState(model.statusMessage ?? '');

  useEffect(() => {
    setStatusMessage(model.statusMessage ?? '');
  }, [model.statusMessage]);

  const handleToggle = () => {
    const nextActive = !model.isActive;
    onToggle({
      id: model.id,
      isActive: nextActive,
      statusMessage: nextActive ? undefined : statusMessage || undefined,
    });
  };

  const handleSaveMessage = () => {
    if (model.isActive) return;
    onToggle({
      id: model.id,
      isActive: false,
      statusMessage: statusMessage || undefined,
    });
  };

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border bg-[#f3f0ed]/2 p-5 transition-colors ${
        model.isActive ? 'border-[#f3f0ed]/8' : 'border-amber-500/20 bg-amber-500/5'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              model.isActive ? 'bg-[#a2dd00]/15' : 'bg-amber-500/15'
            }`}
          >
            {model.isActive ? (
              <Sparkles className="h-4 w-4 text-[#a2dd00]" />
            ) : (
              <TriangleAlert className="h-4 w-4 text-amber-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[#f3f0ed]">{model.label}</h3>
              {providerBadge(model.provider)}
              {typeBadge(model.type)}
            </div>
            <p className="mt-0.5 text-xs text-[#f3f0ed]/40">
              slug: <span className="font-mono text-[#f3f0ed]/60">{model.slug}</span>
              {' · '}
              variant: <span className="font-mono text-[#f3f0ed]/60">{model.modelVariant}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={isPending}
          role="switch"
          aria-checked={model.isActive}
          className={`group relative h-7 w-12 shrink-0 rounded-full border transition-all duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f10] ${
            model.isActive
              ? 'border-[#a2dd00]/40 bg-[#a2dd00] shadow-[0_0_0_1px_rgba(162,221,0,0.15),0_0_20px_-4px_rgba(162,221,0,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] focus-visible:ring-[#a2dd00]/60'
              : 'border-[#f3f0ed]/10 bg-[#f3f0ed]/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] hover:bg-[#f3f0ed]/15 focus-visible:ring-[#f3f0ed]/30'
          }`}
          title={model.isActive ? 'Desativar modelo' : 'Ativar modelo'}
        >
          <span
            className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.3),0_2px_6px_rgba(0,0,0,0.2)] transition-all duration-300 ease-out group-active:w-6 ${
              model.isActive
                ? 'left-[22px] group-active:left-[18px]'
                : 'left-1 group-active:left-1'
            }`}
          />
        </button>
      </div>

      {!model.isActive && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/40">
            Mensagem exibida no painel (opcional)
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Em manutenção — voltamos em breve"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              maxLength={200}
              className="h-9 flex-1 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/25 focus-visible:border-amber-500/30 focus-visible:ring-amber-500/10"
            />
            <button
              onClick={handleSaveMessage}
              disabled={isPending || statusMessage === (model.statusMessage ?? '')}
              className="rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/5 px-3 text-xs font-medium text-[#f3f0ed]/70 transition-colors hover:bg-[#f3f0ed]/10 disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminModelsPage() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: models, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'models'],
    queryFn: () => api.admin.models.list(accessToken!),
    enabled: !!accessToken,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive, statusMessage }: { id: string; isActive: boolean; statusMessage?: string }) =>
      api.admin.models.toggle(accessToken!, id, isActive, statusMessage),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['admin', 'models'] });
      queryClient.invalidateQueries({ queryKey: ['models', 'video'] });
      queryClient.invalidateQueries({ queryKey: ['models', 'image'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao atualizar modelo');
    },
  });

  const total = models?.length ?? 0;
  const activeCount = models?.filter((m) => m.isActive).length ?? 0;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#f3f0ed] md:text-2xl">Modelos</h1>
          <p className="mt-0.5 text-sm text-[#f3f0ed]/40">
            {total} modelos cadastrados · {activeCount} ativos
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f3f0ed]/8 text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="max-w-2xl text-sm text-[#f3f0ed]/50">
        Ative ou desative modelos de IA. Modelos desativados ficam visíveis no painel do usuário como{' '}
        <span className="text-amber-400">em manutenção</span> e não podem ser usados até voltarem a ficar ativos.
      </p>

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      ) : (
        <div className="grid gap-3">
          {models?.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#f3f0ed]/30">Nenhum modelo encontrado</p>
          ) : (
            models?.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                onToggle={toggleMutation.mutate}
                isPending={toggleMutation.isPending}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
