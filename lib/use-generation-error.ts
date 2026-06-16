'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Padrões de erros conhecidos → chave i18n em `home.errors`.
 * A ordem importa: o primeiro padrão que casar vence.
 * Qualquer mensagem que não case com nenhum padrão cai em `generic` — assim o
 * usuário nunca vê o erro técnico/cru do provedor.
 */
const KNOWN_PATTERNS: Array<[RegExp, string]> = [
  [/no image(s)? (returned|in response|generated)|did not return|empty (output|response)|nenhuma imagem/i, 'noResult'],
  [/prohibited use|content policy|violat|blocked by|not allowed/i, 'blockedContent'],
  [/sensitive|flagged|nsfw|safety|moderation/i, 'sensitiveContent'],
  [/insufficient|not enough|saldo insuficiente|sem cr[eé]ditos?|cr[eé]ditos insuficientes/i, 'insufficientCredits'],
  [/limit reached|limite atingido|max(imum)? .* reached|plan limit|quota (exceeded|reached)|limite do (seu )?plano/i, 'limitReached'],
  [/rate[ -]?limit|too many requests|\b429\b/i, 'rateLimited'],
  [/tim(e|ed)?[ -]?out|deadline exceeded|timed out/i, 'timeout'],
];

/**
 * Retorna uma função que traduz qualquer mensagem de erro de geração para uma
 * versão amigável e localizada. Mensagens conhecidas usam a chave mapeada;
 * o resto cai na mensagem genérica.
 *
 * Funciona em qualquer componente — usa o namespace `home.errors`, que está
 * disponível em todos os locales carregados.
 */
export function useGenerationErrorMessage() {
  const t = useTranslations('home.errors');

  return useCallback(
    (raw?: string | null): string => {
      if (!raw || !raw.trim()) return t('generic');
      for (const [pattern, key] of KNOWN_PATTERNS) {
        if (pattern.test(raw)) return t(key);
      }
      return t('generic');
    },
    [t],
  );
}
