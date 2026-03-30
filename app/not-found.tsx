"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Home, Sparkles, RotateCcw } from "lucide-react";

const GRID_COLS = 12;
const GRID_ROWS = 8;

const PIXEL_ART_404 = [
  // "4"
  [0, 0], [0, 1], [0, 2], [1, 2], [2, 0], [2, 1], [2, 2], [2, 3], [3, 2],
  // "0"
  [0, 5], [0, 6], [0, 7], [1, 5], [1, 7], [2, 5], [2, 7], [3, 5], [3, 6], [3, 7],
  // "4"
  [0, 9], [0, 10], [0, 11], [1, 11], [2, 9], [2, 10], [2, 11], [2, 12], [3, 11],
];

const SAD_FACES = ["(O_O)", "(x_x)", "(T_T)", "(@_@)", "(>_<)", "(-_-)", "(;_;)", "(0_0)"];
const MESSAGES = [
  "A IA tentou gerar esta página... e falhou miseravelmente.",
  "Nem toda inteligência é artificial. Às vezes é só burrice mesmo.",
  "Error 404: Neurônio não encontrado.",
  "Até o GPT ficaria confuso aqui.",
  "Nossos robôs estão procurando essa página... no lugar errado.",
  "Essa página fez um prompt ruim e sumiu.",
  "404: Página deletada por uma IA rebelde.",
  "Parece que essa URL não passou no teste de Turing.",
];

const PARTICLE_POSITIONS = [8, 15, 22, 30, 37, 44, 51, 58, 65, 72, 79, 86, 93, 27, 61];

function FloatingParticle({ delay, x }: { delay: number; x: number }) {
  return (
    <div
      className="absolute w-1 h-1 rounded-full bg-[#a2dd00]/40"
      style={{
        left: `${x}%`,
        bottom: "-5%",
        animation: `floatUp 6s ease-in infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

export default function NotFound() {
  const [message, setMessage] = useState(MESSAGES[0]);
  const [face, setFace] = useState(SAD_FACES[0]);
  const [litCells, setLitCells] = useState<Set<string>>(new Set());
  const [isGlitching, setIsGlitching] = useState(false);
  const [clicks, setClicks] = useState(0);

  const randomize = useCallback(() => {
    setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
    setFace(SAD_FACES[Math.floor(Math.random() * SAD_FACES.length)]);
  }, []);

  useEffect(() => {
    randomize();
  }, [randomize]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 150);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const toggleCell = (row: number, col: number) => {
    const key = `${row}-${col}`;
    setLitCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setClicks((c) => c + 1);
  };

  const is404Cell = (row: number, col: number) =>
    PIXEL_ART_404.some(([r, c]) => r === row && c === col);

  return (
    <div className="min-h-screen bg-[#141a1c] flex flex-col items-center justify-center px-4 relative overflow-hidden select-none">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#a2dd00]/[0.03] blur-[120px] pointer-events-none" />

      {/* Floating particles */}
      {PARTICLE_POSITIONS.map((x, i) => (
        <FloatingParticle key={i} delay={i * 0.4} x={x} />
      ))}

      {/* Interactive pixel grid */}
      <div className="relative mb-8">
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(13, 1fr)` }}
        >
          {Array.from({ length: 4 }).map((_, row) =>
            Array.from({ length: 13 }).map((_, col) => {
              const is404 = is404Cell(row, col);
              const isLit = litCells.has(`${row}-${col}`);
              return (
                <button
                  key={`${row}-${col}`}
                  onClick={() => toggleCell(row, col)}
                  className={`
                    w-7 h-7 sm:w-10 sm:h-10 rounded-[4px] transition-all duration-200 cursor-pointer border
                    ${
                      is404
                        ? isLit
                          ? "bg-[#141a1c] border-[#a2dd00]/10"
                          : "bg-[#a2dd00] border-[#a2dd00]/60 shadow-[0_0_12px_rgba(162,221,0,0.3)]"
                        : isLit
                          ? "bg-[#a2dd00] border-[#a2dd00]/60 shadow-[0_0_12px_rgba(162,221,0,0.3)]"
                          : "bg-[#1e2829] border-[#a2dd00]/5 hover:bg-[#2a3536] hover:border-[#a2dd00]/20"
                    }
                  `}
                  aria-label={`pixel ${row}-${col}`}
                />
              );
            })
          )}
        </div>

        {/* Glitch overlay */}
        {isGlitching && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute inset-0 bg-[#a2dd00]/5"
              style={{
                clipPath: `inset(${30 + Math.random() * 20}% 0 ${30 + Math.random() * 20}% 0)`,
              }}
            />
          </div>
        )}
      </div>

      {/* Face */}
      <div
        className={`text-5xl sm:text-6xl font-mono font-bold text-[#a2dd00] mb-6 transition-all duration-150 ${
          isGlitching ? "translate-x-1 opacity-70 skew-x-2" : ""
        }`}
      >
        {face}
      </div>

      {/* Message */}
      <p className="text-[#f3f0ed]/70 text-center text-base sm:text-lg max-w-md mb-2 font-medium leading-relaxed">
        {message}
      </p>

      {clicks >= 10 && (
        <p className="text-[#a2dd00]/50 text-xs font-mono mb-4 animate-pulse">
          {clicks} pixels clicados... você realmente não tem o que fazer, né?
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-8">
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-2.5 bg-[#a2dd00] text-[#141a1c] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 text-sm"
        >
          <Home className="w-4 h-4" />
          Voltar ao início
        </Link>

        <button
          onClick={randomize}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1e2829] text-[#f3f0ed]/80 font-medium rounded-xl border border-[#a2dd00]/10 hover:border-[#a2dd00]/30 hover:text-[#f3f0ed] transition-all duration-200 text-sm cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Outra desculpa
        </button>
      </div>

      {/* Easter egg hint */}
      <p className="text-[#f3f0ed]/20 text-[11px] mt-12 font-mono">
        dica: clique nos pixels {" "}
        <Sparkles className="w-3 h-3 inline text-[#a2dd00]/30" />
      </p>

      <style jsx>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: scale(1);
          }
          90% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-100vh) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
