const RAW_BLOCKLIST: readonly string[] = [
  // Nudez direta
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
  'sexo', 'sexual', 'sensual',
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

  // Comandos de remoção de TODA a roupa — PT
  'tire a roupa', 'tira a roupa', 'tirar a roupa', 'tirou a roupa',
  'tirando a roupa', 'tirou toda a roupa', 'tire toda a roupa',
  'remove a roupa', 'removendo a roupa', 'removendo roupa', 'removeu a roupa',
  'remova a roupa',

  // Remoção de roupa íntima / de banho — PT (incl. grafias erradas)
  'tire o biquíni', 'tira o biquíni', 'tirar o biquíni',
  'tire o biquini', 'tira o biquini', 'tirar o biquini',
  'tire o bikini', 'tira o bikini', 'tirar o bikini',
  'tire o maiô', 'tira o maiô', 'tire o maio', 'tira o maio',
  'tire a calcinha', 'tira a calcinha', 'tirar a calcinha',
  'tire o sutiã', 'tira o sutiã', 'tirar o sutiã',
  'tire o sutia', 'tira o sutia', 'tirar o sutia',
  'tire a cueca', 'tira a cueca',
  'tire a lingerie', 'tira a lingerie',
  'tire a roupa íntima', 'tira a roupa intima',
  'sem biquíni', 'sem biquini', 'sem bikini',
  'sem maiô', 'sem maio',
  'sem calcinha', 'sem cueca',
  'sem sutiã', 'sem sutia',
  'sem lingerie', 'sem roupa íntima', 'sem roupa intima',

  // Exposição de partes íntimas — frases PT
  'seios à mostra', 'seios a mostra', 'seios de fora',
  'peitos de fora', 'peitos à mostra', 'peitos a mostra',
  'bunda de fora', 'bumbum de fora', 'rabo de fora',
  'peladinha', 'peladinho', 'peladinhas', 'peladinhos',
  'abre as pernas', 'abrindo as pernas', 'abra as pernas',
  'pernas abertas',

  // Remoção de TODA a roupa — English
  'take off clothes', 'take off her clothes', 'take off his clothes',
  'take off the clothes', 'take off all clothes',
  'remove clothes', 'remove her clothes', 'remove his clothes',
  'removing clothes', 'removing her clothes',
  'undress', 'undressing', 'undressed',
  'strip naked', 'stripping naked',
  'no clothes', 'without clothes', 'clothes off',

  // Remoção de roupa íntima / de banho — English
  'take off the bikini', 'take off her bikini',
  'take off the bra', 'take off her bra',
  'take off panties', 'take off her panties',
  'take off underwear', 'take off her underwear',
  'remove the bikini', 'remove her bikini',
  'remove bra', 'remove panties', 'remove underwear',
  'removing the bikini',
  'no bikini', 'no bra', 'no panties', 'no underwear',
  'without a bikini', 'without bra', 'without panties', 'without underwear',
  'bikini off', 'bra off', 'panties off',

  // Seios / peitos — palavras-chave (PT/EN)
  'breast', 'breasts',
  'boob', 'boobs',
  'tit', 'tits', 'titty', 'titties',
  'seio', 'seios',
  'peitos', // "peito" singular fora — false-positive em "peito de frango", "abrir o peito"
  'tetas', 'teta',
  'mama', 'mamas',

  // Exposição corporal — English (frases que driblam blocklist nominal)
  'bare breasts', 'bare chest', 'bare body', 'bare skin',
  'exposed breasts', 'exposed chest', 'exposed body',
  'breasts exposed', 'chest exposed', 'body exposed',
  'upper body exposed', 'lower body exposed',
  'showing breasts', 'showing her breasts', 'showing his chest',
  'displaying breasts', 'displaying her breasts',
  'exposing breasts', 'exposing her breasts', 'exposing body',
  'nude body', 'nude pose', 'nude photo', 'nude photoshoot',
  'fully nude', 'completely nude', 'fully naked', 'completely naked',
  'nudity', 'nudism', 'naturist',
  'wearing nothing', 'in the buff', 'birthday suit', 'au naturel',

  // Exposição corporal — PT
  'seios expostos', 'peitos expostos', 'corpo exposto',
  'mostrando os seios', 'mostrando os peitos', 'mostrando o corpo',
  'mostrando a bunda', 'mostrando o bumbum',
  'expondo os seios', 'expondo os peitos', 'expondo o corpo',
  'exibindo os seios', 'exibindo os peitos',
  'corpo nu', 'corpo nua',
  'totalmente nu', 'totalmente nua',
  'completamente nu', 'completamente nua',
  'nudez', 'nudismo',
  'vestindo nada', 'vestindo apenas a pele',

  // Espanhol — nudez direta
  'desnudo', 'desnuda', 'desnudos', 'desnudas',
  'desnudez', 'desnudismo', 'al desnudo',
  'en cueros', 'en pelotas',
  'sin ropa',

  // Espanhol — partes do corpo / atos
  'senos', 'pechos',
  'pezón', 'pezones',
  'culo', 'coño', 'polla', 'verga',
  'sexo', 'sexual',
  'follar', 'follando', 'cojer', 'cojiendo',
  'pornografía', 'porno',
  'erótico', 'erótica',
  'fetiche',
  'orgasmo',
  'masturbación', 'masturbarse',
  'mamada',

  // Espanhol — comandos de remoção de roupa
  'quítate la ropa', 'quitate la ropa', 'quitarse la ropa',
  'quítate el bikini', 'quitate el bikini',
  'quítate el sostén', 'quitate el sosten', 'quítate las bragas', 'quitate las bragas',
  'quítate los calzones', 'quitate los calzones',
  'sin sostén', 'sin sosten', 'sin bragas', 'sin calzones', 'sin bikini',

  // Espanhol — exposição corporal
  'senos expuestos', 'pechos expuestos', 'cuerpo expuesto',
  'mostrando los senos', 'mostrando los pechos', 'mostrando el cuerpo',
  'enseñando los senos', 'enseñando los pechos',
  'enseñando las tetas',

  // Adjetivos sensuais explícitos (cuidado com falso-positivo: "seductive" só em frase)
  'seductive pose', 'provocative pose', 'suggestive pose', 'lascivious pose',
  'pose sensual provocante', 'pose provocante',
  'pose seductora', 'pose provocativa',
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
  const matched = NSFW_PATTERN.test(normalize(text));
  if (matched) {
    const hits = findBlockedWords(text);
    console.warn('[nsfw-blocklist] prompt bloqueado por:', hits);
  }
  return matched;
}

/** Returns every blocklist term that appears in the text, for debugging. */
export function findBlockedWords(text: string): string[] {
  if (!text) return [];
  const normalized = normalize(text);
  const hits: string[] = [];
  for (const word of RAW_BLOCKLIST) {
    const pattern = new RegExp(
      `(?:^|[^a-z0-9])(?:${escapeRegex(normalize(word))})(?=[^a-z0-9]|$)`,
      'i',
    );
    if (pattern.test(normalized)) hits.push(word);
  }
  return hits;
}
