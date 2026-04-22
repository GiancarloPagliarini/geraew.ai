const RAW_BLOCKLIST: readonly string[] = [
  // Nudez direta
  'nude', 'nudes', 'naked',
  'nu', 'nua', 'nus', 'nuas',
  'pelado', 'pelada', 'pelados', 'peladas',
  'despido', 'despida',
  'sem roupa',
  'topless', 'bottomless',

  // Pornografia / conteúdo explícito
  'porn', 'porno', 'pornô', 'pornografia', 'pornography',
  'pornográfico', 'pornográfica',
  'xxx', 'nsfw', '18+',
  'hentai', 'pornstar', 'porn star',

  // Genitália
  'pussy', 'vagina', 'vulva',
  'buceta', 'xereca', 'xoxota', 'perereca',
  'dick', 'cock', 'penis', 'pênis',
  'pau', 'pinto', 'pica', 'rola',
  'genital', 'genitália',
  'mamilo', 'mamilos', 'nipple', 'nipples',

  // Atos sexuais
  'sexo', 'sexual',
  'fuck', 'fucking',
  'foder', 'fodendo',
  'transando', 'trepando',
  'masturbation', 'masturbação', 'masturbando',
  'blowjob', 'boquete', 'chupada',
  'orgasm', 'orgasmo',
  'cumshot', 'gozada', 'gozando',
  'orgia', 'orgy', 'ménage',
  'anal', 'sexo oral', 'oral sex',

  // Erótico / fetiche
  'erotic', 'erótico', 'erótica',
  'fetish', 'fetiche',
  'striptease', 'stripper',
];

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const NSFW_PATTERN = new RegExp(
  `(?:^|[^a-z0-9])(?:${RAW_BLOCKLIST.map((w) => escapeRegex(normalize(w))).join('|')})(?=[^a-z0-9]|$)`,
  'i',
);

export function containsNsfwContent(text: string | null | undefined): boolean {
  if (!text || !text.trim()) return false;
  return NSFW_PATTERN.test(normalize(text));
}
