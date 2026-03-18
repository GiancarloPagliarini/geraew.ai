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
  'Mixed colors': '',
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
}

const DEFAULTS: InfluencerSelections = {
  characterType: 'Human',
  gender: 'Female',
  ethnicity: 'European',
  skinColor: 'Mixed colors',
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
