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
import { useState } from 'react';
import { Section } from './Section';

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
              <OptionPills
                options={['Humano', 'Anime', 'Semi-realista', 'Cartoon']}
                value={characterType}
                onChange={setCharacterType}
              />
            </Section>

            <Section title="GÊNERO" icon={ImageIcon}>
              <OptionPills
                options={['Feminino', 'Masculino', 'Não-binário']}
                value={gender}
                onChange={setGender}
              />
            </Section>

            <Section title="ETNIA / ORIGEM BASE" icon={Globe}>
              <OptionPills
                options={['Latina', 'Europeia', 'Africana', 'Asiática', 'Árabe', 'Indígena']}
                value={ethnicity}
                onChange={setEthnicity}
              />
            </Section>

            <Section title="COR DA PELE" icon={CircleDot}>
              <OptionPills
                options={['Clara', 'Média', 'Morena', 'Escura', 'Muito escura']}
                value={skinColor}
                onChange={setSkinColor}
              />
            </Section>

            <Section title="COR DOS OLHOS" icon={Palette}>
              <OptionPills
                options={['Castanho', 'Verde', 'Azul', 'Mel', 'Cinza', 'Heterocromia']}
                value={eyeColor}
                onChange={setEyeColor}
              />
            </Section>

            <Section title="CONDIÇÕES DA PELE" icon={User}>
              <OptionPills
                options={['Lisa', 'Sardas', 'Manchas', 'Acne', 'Cicatrizes']}
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
