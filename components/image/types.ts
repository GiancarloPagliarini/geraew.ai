/** Geração em andamento exibida como preview nas Criações. */
export interface PendingGeneration {
  /** id da geração na API */
  key: string;
  /** prompt usado na geração — exibido abaixo do preview */
  prompt: string;
  /** definida quando a geração conclui — dispara a revelação no preview */
  url?: string;
  /** definida quando a geração falha — exibe o card de erro */
  error?: string;
  /** tipo da geração — 'voice' usa o card compacto de áudio */
  kind?: 'image' | 'video' | 'voice';
}
