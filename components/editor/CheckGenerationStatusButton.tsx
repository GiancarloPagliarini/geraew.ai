'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api, Generation } from '@/lib/api';
import { showGenerationError } from './GenerationError';

interface CheckGenerationStatusButtonProps {
  generationId: string | null;
  accessToken: string | null;
  onCompleted: (generation: Generation) => void;
  onFailed: (generation: Generation) => void;
}

export function CheckGenerationStatusButton({
  generationId,
  accessToken,
  onCompleted,
  onFailed,
}: CheckGenerationStatusButtonProps) {
  const [isChecking, setIsChecking] = useState(false);

  async function handleCheck() {
    if (!accessToken || !generationId || isChecking) return;
    setIsChecking(true);
    try {
      const generation = await api.generations.get(accessToken, generationId);
      if (generation.status === 'COMPLETED') {
        onCompleted(generation);
      } else if (generation.status === 'FAILED') {
        showGenerationError({ errorMessage: generation.errorMessage, fallback: 'Erro ao gerar.' });
        onFailed(generation);
      } else {
        toast.info('Ainda processando...', { description: 'A geração continua em andamento.' });
      }
    } catch {
      toast.error('Erro ao verificar status.', { description: 'Tente novamente.' });
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <button
      onClick={handleCheck}
      disabled={isChecking || !generationId}
      className="mt-1 flex items-center gap-1.5 animate-pulse border border-white/15 rounded-lg px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/60 disabled:opacity-40"
    >
      <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
      {isChecking ? 'VERIFICANDO...' : 'VERIFICAR GERAÇÃO'}
    </button>
  );
}
