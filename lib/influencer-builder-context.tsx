'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// ─── Prompt descriptions (English) ───────────────────────────────────────────

const CHARACTER_DESC: Record<string, string> = {
  Human: 'a human',
  Ant: 'an ant-like humanoid creature with insectoid features',
  Bee: 'a bee-like humanoid creature with insectoid features',
  Octopus: 'an octopus-like humanoid creature with tentacle features',
  Crocodile: 'a crocodile-like humanoid creature with scaly reptilian features',
  Iguana: 'an iguana-like humanoid creature with spiny reptilian features',
  Lizard: 'a lizard-like humanoid creature with smooth reptilian features',
  Alien: 'an alien humanoid creature with otherworldly features',
  Beetle: 'a beetle-like humanoid creature with armored insectoid features',
  Reptile: 'a reptile-like humanoid creature with scaled features',
  Amphibian: 'an amphibian-like humanoid creature with smooth moist skin',
  Elf: 'an elf with elegant pointed ears and ethereal features',
  Mantis: 'a praying mantis-like humanoid creature with insectoid features',
};

const GENDER_DESC: Record<string, string> = {
  Female: 'female',
  Male: 'male',
  'Trans man': 'transgender male',
  'Trans woman': 'transgender female',
  'Non-binary': 'non-binary androgynous',
};

const ETHNICITY_DESC: Record<string, string> = {
  African: 'with African ethnic features, dark rich skin tone',
  Asian: 'with East Asian ethnic features',
  European: 'with European ethnic features',
  Indian: 'with South Asian Indian ethnic features',
  'Middle Eastern': 'with Middle Eastern ethnic features',
  Mixed: 'with mixed ethnicity features',
};

const SKIN_COLOR_DESC: Record<string, string> = {
  Morena: 'tan/olive brown skin',
  Preta: 'dark black skin',
  Branca: 'fair white skin',
};

const EYE_COLOR_DESC: Record<string, string> = {
  Black: 'deep black',
  Purple: 'vivid purple',
  Green: 'bright green',
  White: 'pale white',
  Brown: 'warm brown',
  'Black (Solid)': 'completely solid black with no visible iris',
  'White (Blind)': 'completely white with no visible iris, blind-looking',
  'Deep Brown': 'deep dark brown',
  Blue: 'striking blue',
  Amber: 'golden amber',
  Red: 'intense red',
  Grey: 'steel grey',
};

const SKIN_CONDITION_DESC: Record<string, string> = {
  Vitiligo: 'with vitiligo patches of depigmented skin',
  Pigmentation: 'with uneven skin pigmentation and dark spots',
  Freckles: 'with freckles scattered across the face',
  Birthmarks: 'with visible birthmarks on the skin',
  Scars: 'with visible scars on the face',
  Burns: 'with burn marks on the skin',
  Albinism: 'with albinism, very pale skin and light features',
  'Cracked/dry skin': 'with cracked and dry textured skin',
  'Wrinkled skin': 'with deeply wrinkled and aged skin',
};

const AGE_DESC: Record<string, string> = {
  Adolescente: 'teenager, around 16 years old',
  'Jovem adulto': 'young adult, around 25 years old',
  Adulto: 'adult, around 35 years old',
  'Meia-idade': 'middle-aged, around 50 years old',
  Idoso: 'elderly, around 70 years old',
};

const EYE_TYPE_DESC: Record<string, string> = {
  Human: 'human-shaped',
  Reptile: 'reptilian with vertical slit pupils',
  Mechanical: 'mechanical cybernetic',
};

const EYE_DETAILS_DESC: Record<string, string> = {
  'Different colors': 'with heterochromia, each eye a different color',
  'Blind eye': 'with one blind clouded eye',
  'Scarred eye': 'with a scar running across one eye',
  'Glowing eye': 'with one eye glowing with supernatural light',
};

const MOUTH_DESC: Record<string, string> = {
  'Small mouth': 'with a small delicate mouth',
  'Large mouth': 'with a wide prominent mouth',
  'No teeth': 'with no visible teeth',
  'Different teeth': 'with irregular asymmetric teeth',
  'Sharp teeth': 'with sharp pointed fangs',
  'Forked tongue': 'with a forked serpentine tongue',
  'Two tongues': 'with two separate tongues',
};

const EARS_DESC: Record<string, string> = {
  Human: '',
  Elf: 'with long pointed elf ears',
  'No Ears': 'with no visible ears',
  'Wing Ears': 'with wing-shaped ears',
};

const HORNS_DESC: Record<string, string> = {
  'Small Horns': 'with small curved horns on the forehead',
  'Big Horns': 'with large imposing horns',
  Antlers: 'with branching deer-like antlers',
};

const FACE_MATERIAL_DESC: Record<string, string> = {
  'Human skin': '',
  Scales: 'with scaly textured skin',
  Fur: 'with fur-covered skin',
  'Amphibian skin': 'with smooth moist amphibian skin',
  'Fish skin': 'with iridescent fish-like skin',
  Metallic: 'with metallic chrome-like skin',
};

const SURFACE_DESC: Record<string, string> = {
  Solid: '',
  Stripes: 'with striped skin pattern',
  Spots: 'with spotted skin pattern',
  Chess: 'with checkered skin pattern',
  Veins: 'with visible veins across the skin',
  Giraffe: 'with giraffe-like skin pattern',
  Cowhide: 'with cowhide spotted pattern',
};

const BODY_TYPE_DESC: Record<string, string> = {
  Slim: 'slim body build',
  Lean: 'lean toned body build',
  Athletic: 'athletic fit body build',
  Muscular: 'muscular heavily built body',
  Curvy: 'curvy body shape',
  Heavy: 'heavy large body build',
  Skinny: 'very skinny thin body build',
};

const ARM_DESC: Record<string, string> = {
  'Normal arm': '',
  'Cute arm': 'cute stylized',
  'Robotic arm': 'robotic cybernetic',
  'Prosthetic arm': 'prosthetic',
  'Mechanical arm': 'mechanical steampunk',
  None: 'missing',
};

const LEG_DESC: Record<string, string> = {
  'Normal leg': '',
  'Cute leg': 'cute stylized',
  'Robotic leg': 'robotic cybernetic',
  'Prosthetic leg': 'prosthetic',
  'Mechanical leg': 'mechanical steampunk',
  None: 'missing',
};

const HAIR_DESC: Record<string, string> = {
  Bald: 'bald head',
  'Short hair': 'short hair',
  'Long hair': 'long flowing hair',
  Afro: 'afro hairstyle',
  'Punk hairstyle': 'punk mohawk hairstyle',
  Fur: 'fur-covered head',
  Tentacles: 'tentacles instead of hair',
  Spines: 'sharp spines instead of hair',
};

const HAIR_COLOR_DESC: Record<string, string> = {
  Black: 'black hair',
  'Dark Brown': 'dark brown hair',
  Brown: 'brown hair',
  'Light Brown': 'light brown hair',
  Blonde: 'blonde hair',
  'Platinum Blonde': 'platinum blonde hair',
  Red: 'red hair',
  Ginger: 'ginger hair',
  Auburn: 'auburn hair',
  Grey: 'grey hair',
  White: 'white hair',
  Blue: 'blue hair',
  Pink: 'pink hair',
  Purple: 'purple hair',
  Green: 'green hair',
  'Ombre': 'ombre gradient hair',
  'Highlights': 'hair with highlights',
};

const ACCESSORIES_DESC: Record<string, string> = {
  Tattoos: 'with visible tattoos',
  Piercing: 'with facial piercings',
  Scarification: 'with scarification body art',
  Symbols: 'with mystical symbols and markings on the skin',
  'Cyber markings': 'with glowing cybernetic markings on the skin',
};

const RENDERING_STYLE_DESC: Record<string, string> = {
  'Hiper-realista': 'hyper-realistic photographic style',
  Anime: 'anime art style',
  Cartoon: 'cartoon art style',
  'Ilustração 2D': '2D illustration art style',
};

// ─── State interface ─────────────────────────────────────────────────────────

export interface InfluencerSelections {
  characterType: string;
  gender: string;
  ethnicity: string;
  skinColor: string;
  eyeColor: string;
  skinCondition: string;
  age: string;
  eyeType: string;
  eyeDetails: string;
  mouth: string;
  ears: string;
  horns: string;
  faceSkinMaterial: string;
  surfacePattern: string;
  bodyType: string;
  leftArm: string;
  rightArm: string;
  leftLeg: string;
  rightLeg: string;
  hair: string;
  hairColor: string;
  accessories: string;
  renderingStyle: string;
}

const DEFAULTS: InfluencerSelections = {
  characterType: 'Human',
  gender: 'Female',
  ethnicity: 'European',
  skinColor: 'Morena',
  eyeColor: 'Brown',
  skinCondition: '',
  age: 'Jovem adulto',
  eyeType: 'Human',
  eyeDetails: '',
  mouth: '',
  ears: 'Human',
  horns: '',
  faceSkinMaterial: 'Human skin',
  surfacePattern: 'Solid',
  bodyType: 'Athletic',
  leftArm: 'Normal arm',
  rightArm: 'Normal arm',
  leftLeg: 'Normal leg',
  rightLeg: 'Normal leg',
  hair: 'Short hair',
  hairColor: 'Dark Brown',
  accessories: '',
  renderingStyle: 'Hiper-realista',
};

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(s: InfluencerSelections): string {
  const parts: string[] = [];

  // Opening: "Generate a photorealistic portrait photograph of a [gender] [character], [age]"
  const gender = GENDER_DESC[s.gender] ?? 'female';
  const character = CHARACTER_DESC[s.characterType] ?? 'a human';
  const age = AGE_DESC[s.age] ?? 'young adult, around 25 years old';
  parts.push(`Generate a photorealistic portrait photograph of ${gender} ${character}, ${age}`);

  // Ethnicity
  const ethnicity = ETHNICITY_DESC[s.ethnicity];
  if (ethnicity) parts.push(ethnicity);

  // Skin condition
  const skinCond = s.skinCondition ? SKIN_CONDITION_DESC[s.skinCondition] : '';
  if (skinCond) parts.push(skinCond);

  // Eyes
  const eyeColor = EYE_COLOR_DESC[s.eyeColor] ?? 'brown';
  const eyeType = EYE_TYPE_DESC[s.eyeType] ?? '';
  const eyeTypeStr = eyeType ? ` ${eyeType}` : '';
  parts.push(`with ${eyeColor}${eyeTypeStr} eyes`);

  // Eye details
  const eyeDetail = s.eyeDetails ? EYE_DETAILS_DESC[s.eyeDetails] : '';
  if (eyeDetail) parts.push(eyeDetail);

  // Mouth
  const mouth = s.mouth ? MOUTH_DESC[s.mouth] : '';
  if (mouth) parts.push(mouth);

  // Ears
  const ears = EARS_DESC[s.ears];
  if (ears) parts.push(ears);

  // Horns
  const horns = s.horns ? HORNS_DESC[s.horns] : '';
  if (horns) parts.push(horns);

  // Face skin material
  const material = FACE_MATERIAL_DESC[s.faceSkinMaterial];
  if (material) parts.push(material);

  // Surface pattern
  const pattern = SURFACE_DESC[s.surfacePattern];
  if (pattern) parts.push(pattern);

  // Body type
  const bodyType = BODY_TYPE_DESC[s.bodyType];
  if (bodyType) parts.push(bodyType);

  // Arms
  const leftArm = ARM_DESC[s.leftArm];
  const rightArm = ARM_DESC[s.rightArm];
  if (leftArm && rightArm && leftArm === rightArm) {
    parts.push(`with ${leftArm} arms`);
  } else {
    if (leftArm) parts.push(`with ${leftArm} left arm`);
    if (rightArm) parts.push(`with ${rightArm} right arm`);
  }

  // Legs
  const leftLeg = LEG_DESC[s.leftLeg];
  const rightLeg = LEG_DESC[s.rightLeg];
  if (leftLeg && rightLeg && leftLeg === rightLeg) {
    parts.push(`with ${leftLeg} legs`);
  } else {
    if (leftLeg) parts.push(`with ${leftLeg} left leg`);
    if (rightLeg) parts.push(`with ${rightLeg} right leg`);
  }

  // Hair
  const hair = HAIR_DESC[s.hair];
  if (hair) parts.push(hair);

  // Hair color
  const hairColor = HAIR_COLOR_DESC[s.hairColor];
  if (hairColor) parts.push(hairColor);

  // Accessories
  const acc = s.accessories ? ACCESSORIES_DESC[s.accessories] : '';
  if (acc) parts.push(acc);

  // Rendering style
  const renderStyle = RENDERING_STYLE_DESC[s.renderingStyle];
  if (renderStyle && s.renderingStyle !== 'Hiper-realista') {
    parts.push(renderStyle);
  }

  // Cinematic suffix
  parts.push(
    'Shot with cinematic studio lighting, shallow depth of field, professional portrait style, ultra high detail, 8K quality',
  );

  return parts.filter(Boolean).join(', ') + '.';
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface InfluencerBuilderContextValue {
  selections: InfluencerSelections;
  set: <K extends keyof InfluencerSelections>(key: K, value: InfluencerSelections[K]) => void;
  reset: () => void;
  prompt: string;
}

const InfluencerBuilderContext = createContext<InfluencerBuilderContextValue | null>(null);

export function InfluencerBuilderProvider({ children }: { children: React.ReactNode }) {
  const [selections, setSelections] = useState<InfluencerSelections>(DEFAULTS);

  const set = useCallback(
    <K extends keyof InfluencerSelections>(key: K, value: InfluencerSelections[K]) => {
      setSelections((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const reset = useCallback(() => setSelections(DEFAULTS), []);

  const prompt = useMemo(() => buildPrompt(selections), [selections]);

  return (
    <InfluencerBuilderContext.Provider value={{ selections, set, reset, prompt }}>
      {children}
    </InfluencerBuilderContext.Provider>
  );
}

export function useInfluencerBuilder() {
  const ctx = useContext(InfluencerBuilderContext);
  if (!ctx) throw new Error('useInfluencerBuilder must be used within InfluencerBuilderProvider');
  return ctx;
}
