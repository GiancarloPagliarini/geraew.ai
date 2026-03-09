'use client';

import {
  ChessKing,
  CircleDot,
  Ear,
  Eye,
  Globe,
  ImageIcon,
  Palette,
  RotateCcw,
  Shirt,
  Smile,
  Sparkles,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { Section } from './Section';

// ─── Character type data ──────────────────────────────────────────────────────

const CHARACTER_TYPES = [
  { id: 'Humano', label: 'Humano', image: '/characters/humano.svg' },
  { id: 'Anime', label: 'Anime', image: '/characters/anime.svg' },
  { id: 'Semi-realista', label: 'Semi-realista', image: '/characters/semi-realista.svg' },
  { id: 'Cartoon', label: 'Cartoon', image: '/characters/cartoon.svg' },
  { id: '3D', label: '3D Render', image: '/characters/3d.svg' },
  { id: 'Pixel Art', label: 'Pixel Art', image: '/characters/pixel-art.svg' },
] as const;

const ETHNICITY_TYPES = [
  { id: 'Latina', label: 'Latina', image: '/characters/latina.svg' },
  { id: 'Europeia', label: 'Europeia', image: '/characters/europeia.svg' },
  { id: 'Africana', label: 'Africana', image: '/characters/africana.svg' },
  { id: 'Asiática', label: 'Asiática', image: '/characters/asiatica.svg' },
  { id: 'Árabe', label: 'Árabe', image: '/characters/arabe.svg' },
  { id: 'Indígena', label: 'Indígena', image: '/characters/indigena.svg' },
] as const;

const GENDER_TYPES = [
  { id: 'Feminino', label: 'Feminino', image: '/characters/feminino.svg' },
  { id: 'Masculino', label: 'Masculino', image: '/characters/masculino.svg' },
  { id: 'Não-binário', label: 'Não-binário', image: '/characters/nao-binario.svg' },
] as const;

const EYE_COLORS = [
  { id: 'Castanho', label: 'Castanho', color: '#6B3410' },
  { id: 'Verde', label: 'Verde', color: '#3d8b2f' },
  { id: 'Azul', label: 'Azul', color: '#3a7fc4' },
  { id: 'Mel', label: 'Mel', color: '#c48a20' },
  { id: 'Cinza', label: 'Cinza', color: '#8a929a' },
  { id: 'Heterocromia', label: 'Heterocromia', color: 'linear-gradient(135deg, #3a7fc4 50%, #6B3410 50%)' },
] as const;

const SKIN_COLORS = [
  { id: 'Clara', label: 'Clara', color: '#f5d6b8' },
  { id: 'Média', label: 'Média', color: '#d4a373' },
  { id: 'Morena', label: 'Morena', color: '#b07d56' },
  { id: 'Escura', label: 'Escura', color: '#8b5e3c' },
  { id: 'Muito escura', label: 'Muito escura', color: '#4a2c17' },
] as const;

const SKIN_CONDITIONS = [
  { id: 'Lisa', label: 'Lisa', color: '#d4a373' },
  { id: 'Sardas', label: 'Sardas', color: 'radial-gradient(circle 2px, #8b5e3c 30%, transparent 30%), radial-gradient(circle 1.5px, #a0704a 20%, transparent 20%), #d4a373' },
  { id: 'Manchas', label: 'Manchas', color: 'radial-gradient(ellipse 40% 35% at 35% 40%, rgba(139,94,60,0.5) 0%, transparent 100%), radial-gradient(ellipse 30% 40% at 65% 60%, rgba(139,94,60,0.4) 0%, transparent 100%), #d4a373' },
  { id: 'Acne', label: 'Acne', color: 'radial-gradient(circle 3px at 30% 35%, #c46b6b 0%, transparent 70%), radial-gradient(circle 2px at 55% 50%, #d07070 0%, transparent 70%), radial-gradient(circle 2.5px at 70% 30%, #c46b6b 0%, transparent 70%), radial-gradient(circle 2px at 40% 65%, #d07070 0%, transparent 70%), #d4a373' },
  { id: 'Cicatrizes', label: 'Cicatrizes', color: 'linear-gradient(160deg, transparent 42%, rgba(190,160,130,0.6) 44%, rgba(190,160,130,0.6) 46%, transparent 48%), linear-gradient(130deg, transparent 55%, rgba(190,160,130,0.5) 57%, rgba(190,160,130,0.5) 59%, transparent 61%), #d4a373' },
] as const;

// ─── ColorSwatchGrid ──────────────────────────────────────────────────────────

function ColorSwatchGrid({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ id: string; label: string; color: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5 mt-2">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className="group flex flex-col items-center gap-1.5 transition-all active:scale-95"
          >
            <div
              className="h-10 w-10 rounded-full transition-all duration-200 group-hover:scale-110"
              style={{
                background: opt.color,
                border: `3px solid ${active ? '#a2dd00' : 'rgba(243,240,237,0.08)'}`,
                boxShadow: active
                  ? '0 0 0 2px rgba(162,221,0,0.3), 0 0 12px rgba(162,221,0,0.15)'
                  : 'inset 0 2px 4px rgba(0,0,0,0.15)',
              }}
            />
            <span
              className="text-[9px] font-semibold transition-colors"
              style={{ color: active ? '#a2dd00' : 'rgba(243,240,237,0.35)' }}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── ImageOptionGrid ──────────────────────────────────────────────────────────

function ImageOptionGrid({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ id: string; label: string; image: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className="group relative aspect-square overflow-hidden rounded-xl transition-all active:scale-95"
            style={{
              border: `2px solid ${active ? 'rgba(162,221,0,0.6)' : 'rgba(243,240,237,0.06)'}`,
              boxShadow: active ? '0 0 12px rgba(162,221,0,0.15)' : 'none',
            }}
          >
            {/* Image */}
            <Image
              src={opt.image}
              alt={opt.label}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="120px"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

            {/* Label */}
            <span className="absolute bottom-1.5 left-2 text-[11px] font-bold text-white drop-shadow-md">
              {opt.label}
            </span>

            {/* Active check */}
            {active && (
              <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#a2dd00] shadow-md">
                <svg className="h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── OptionPills ──────────────────────────────────────────────────────────────

function OptionPills({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-all active:scale-95"
            style={{
              background: active ? 'rgba(162,221,0,0.1)' : 'rgba(30,73,75,0.15)',
              color: active ? '#a2dd00' : 'rgba(243,240,237,0.4)',
              border: `1px solid ${active ? 'rgba(162,221,0,0.28)' : 'rgba(243,240,237,0.06)'}`,
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── AdvancedTabCard ──────────────────────────────────────────────────────────

function AdvancedTabCard({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-2 rounded-xl p-3 transition-all active:scale-95"
      style={{
        background: active ? 'rgba(162,221,0,0.07)' : 'rgba(30,73,75,0.15)',
        border: `1px solid ${active ? 'rgba(162,221,0,0.28)' : 'rgba(243,240,237,0.06)'}`,
      }}
    >
      <Icon className={`h-5 w-5 ${active ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/25'}`} />
      <span className={`text-[9px] font-bold tracking-wider ${active ? 'text-[#f3f0ed]/70' : 'text-[#f3f0ed]/30'}`}>
        {label}
      </span>
    </button>
  );
}

// ─── InfluencerSidebar ────────────────────────────────────────────────────────

export function InfluencerSidebar() {
  const [tab, setTab] = useState<'builder' | 'prompt'>('builder');
  const [advancedTab, setAdvancedTab] = useState<'face' | 'body' | 'style'>('face');

  // Builder form state
  const [characterType, setCharacterType] = useState('Humano');
  const [gender, setGender] = useState('Feminino');
  const [ethnicity, setEthnicity] = useState('Latina');
  const [skinColor, setSkinColor] = useState('Clara');
  const [eyeColor, setEyeColor] = useState('Castanho');
  const [skinCondition, setSkinCondition] = useState('Lisa');
  const [age, setAge] = useState('Jovem adulto');

  // Advanced: Face
  const [eyeType, setEyeType] = useState('Amendoado');
  const [eyeDetails, setEyeDetails] = useState('Natural');
  const [mouth, setMouth] = useState('Natural');
  const [ears, setEars] = useState('Normal');

  function handleReset() {
    setCharacterType('Humano');
    setGender('Feminino');
    setEthnicity('Latina');
    setSkinColor('Clara');
    setEyeColor('Castanho');
    setSkinCondition('Lisa');
    setAge('Jovem adulto');
    setEyeType('Amendoado');
    setEyeDetails('Natural');
    setMouth('Natural');
    setEars('Normal');
  }

  return (
    <>
      {/* Tab toggle + Reset */}
      <div className="flex items-center justify-between border-b border-[#f3f0ed]/[0.05] px-4 py-3">
        <div className="flex gap-1 rounded-lg bg-[#f3f0ed]/[0.04] p-0.5">
          <button
            onClick={() => setTab('builder')}
            className="rounded-md px-3 py-1.5 text-[10px] font-bold tracking-wider transition-all"
            style={{
              background: tab === 'builder' ? 'rgba(162,221,0,0.12)' : 'transparent',
              color: tab === 'builder' ? '#a2dd00' : 'rgba(243,240,237,0.35)',
            }}
          >
            Builder
          </button>
          <button
            onClick={() => setTab('prompt')}
            className="rounded-md px-3 py-1.5 text-[10px] font-bold tracking-wider transition-all"
            style={{
              background: tab === 'prompt' ? 'rgba(162,221,0,0.12)' : 'transparent',
              color: tab === 'prompt' ? '#a2dd00' : 'rgba(243,240,237,0.35)',
            }}
          >
            Prompt
          </button>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-[10px] font-semibold text-[#f3f0ed]/30 transition-colors hover:text-[#f3f0ed]/60"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {/* Content area */}
      <div className="sidebar-scroll flex-1 overflow-y-auto">
        {tab === 'prompt' ? (
          <div className="p-4">
            <textarea
              rows={6}
              placeholder="Descreva sua influencer em detalhes..."
              className="w-full resize-none rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 py-2.5 text-sm text-[#f3f0ed]/90 placeholder-[#f3f0ed]/25 outline-none transition-all focus:border-[#a2dd00]/40 focus:bg-[#1e494b]/30"
            />
          </div>
        ) : (
          <>
            {/* ── Basic builder sections ─────────────────────────────── */}
            <Section title="TIPO DE PERSONAGEM" icon={Users}>
              <ImageOptionGrid
                options={CHARACTER_TYPES}
                value={characterType}
                onChange={setCharacterType}
              />
            </Section>

            <Section title="GÊNERO" icon={ImageIcon}>
              <ImageOptionGrid
                options={GENDER_TYPES}
                value={gender}
                onChange={setGender}
              />
            </Section>

            <Section title="ETNIA" icon={Globe}>
              <ImageOptionGrid
                options={ETHNICITY_TYPES}
                value={ethnicity}
                onChange={setEthnicity}
              />
            </Section>

            <Section title="COR DA PELE" icon={CircleDot}>
              <ColorSwatchGrid
                options={SKIN_COLORS}
                value={skinColor}
                onChange={setSkinColor}
              />
            </Section>

            <Section title="COR DOS OLHOS" icon={Palette}>
              <ColorSwatchGrid
                options={EYE_COLORS}
                value={eyeColor}
                onChange={setEyeColor}
              />
            </Section>

            <Section title="CONDIÇÕES DA PELE" icon={User}>
              <ColorSwatchGrid
                options={SKIN_CONDITIONS}
                value={skinCondition}
                onChange={setSkinCondition}
              />
            </Section>

            <Section title="IDADE" icon={ImageIcon}>
              <OptionPills
                options={['Adolescente', 'Jovem adulto', 'Adulto', 'Meia-idade', 'Idoso']}
                value={age}
                onChange={setAge}
              />
            </Section>

            {/* ── Advanced settings ──────────────────────────────────── */}
            <div className="border-b border-[#f3f0ed]/[0.05] px-4 py-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#a2dd00]/10">
                  <Sparkles className="h-3.5 w-3.5 text-[#a2dd00]" />
                </div>
                <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/55">
                  CONFIGURAÇÕES AVANÇADAS
                </span>
              </div>

              <div className="flex gap-2">
                <AdvancedTabCard
                  icon={Smile}
                  label="Face"
                  active={advancedTab === 'face'}
                  onClick={() => setAdvancedTab('face')}
                />
                <AdvancedTabCard
                  icon={Shirt}
                  label="Body"
                  active={advancedTab === 'body'}
                  onClick={() => setAdvancedTab('body')}
                />
                <AdvancedTabCard
                  icon={ChessKing}
                  label="Style"
                  active={advancedTab === 'style'}
                  onClick={() => setAdvancedTab('style')}
                />
              </div>
            </div>

            {/* Advanced sub-sections */}
            {advancedTab === 'face' && (
              <>
                <Section title="OLHOS - TIPO" icon={Eye}>
                  <OptionPills
                    options={['Amendoado', 'Arredondado', 'Puxado', 'Caído', 'Monolid']}
                    value={eyeType}
                    onChange={setEyeType}
                  />
                </Section>
                <Section title="BOCA & DENTES" icon={Smile}>
                  <OptionPills
                    options={['Natural', 'Lábios finos', 'Lábios grossos', 'Sorriso aberto']}
                    value={mouth}
                    onChange={setMouth}
                  />
                </Section>
                <Section title="ORELHAS" icon={Ear}>
                  <OptionPills
                    options={['Normal', 'Grandes', 'Pequenas', 'Pontudas']}
                    value={ears}
                    onChange={setEars}
                  />
                </Section>
              </>
            )}

            {advancedTab === 'body' && (
              <div className="px-4 py-8 text-center text-[10px] text-[#f3f0ed]/20">
                Em breve...
              </div>
            )}

            {advancedTab === 'style' && (
              <div className="px-4 py-8 text-center text-[10px] text-[#f3f0ed]/20">
                Em breve...
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
