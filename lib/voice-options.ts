export interface VoiceOption {
  value: string;
  label: string;
  /** ISO-ish hint used by VoicesDialog to render a small flag/locale badge. */
  language: 'pt' | 'en' | 'es';
  gender: 'F' | 'M';
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { value: 'ana-pt', label: 'Ana (PT) — Feminina', language: 'pt', gender: 'F' },
  { value: 'carlos-pt', label: 'Carlos (PT) — Masculina', language: 'pt', gender: 'M' },
  { value: 'sofia-pt', label: 'Sofia (PT) — Feminina jovem', language: 'pt', gender: 'F' },
  { value: 'rafael-pt', label: 'Rafael (PT) — Masculina jovem', language: 'pt', gender: 'M' },
  { value: 'emma-en', label: 'Emma (EN) — Feminina', language: 'en', gender: 'F' },
  { value: 'james-en', label: 'James (EN) — Masculina', language: 'en', gender: 'M' },
  { value: 'lucia-es', label: 'Lucía (ES) — Feminina', language: 'es', gender: 'F' },
  { value: 'diego-es', label: 'Diego (ES) — Masculina', language: 'es', gender: 'M' },
];
