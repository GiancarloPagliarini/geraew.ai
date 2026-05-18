# Identidade Visual — GeraEW

Documento de referência da identidade visual do produto: paleta de cores, tipografia, raios, sombras e padrões de UI extraídos do código real (`app/globals.css` + `app/layout.tsx`).

---

## 1. Marca

- **Nome:** GeraEW
- **Posicionamento:** Plataforma de criação de influencers digitais com Inteligência Artificial.
- **Tema padrão:** Dark mode (alinhado ao nicho de IA).
- **Tom visual:** Tech, premium, minimalista, com toques neon para CTAs.

---

## 2. Paleta de Cores

### 2.1 Cores da marca (Landing)

| Token CSS                              | HEX / RGBA                       | Uso                                           |
| -------------------------------------- | -------------------------------- | --------------------------------------------- |
| `--color-landing-bg`                   | `#141a1c`                        | Fundo principal da landing                    |
| `--color-landing-bg-secondary`         | `#1a2123`                        | Fundo secundário (seções alternadas)          |
| `--color-landing-card`                 | `#1e2829`                        | Fundo de cards                                |
| `--color-landing-card-hover`           | `#243032`                        | Hover de cards                                |
| `--color-landing-accent`               | `#a2dd00`                        | **Verde neon — cor primária da marca / CTAs** |
| `--color-landing-accent-hover`         | `#8bc400`                        | Hover do CTA primário                         |
| `--color-landing-green`                | `#a2dd00`                        | Alias do accent                               |
| `--color-landing-text`                 | `#f3f0ed`                        | Texto principal (off-white quente)            |
| `--color-landing-text-secondary`       | `rgba(243, 240, 237, 0.6)`       | Texto secundário                              |
| `--color-landing-text-muted`           | `rgba(243, 240, 237, 0.35)`      | Texto desabilitado / hint                     |

### 2.2 Cores do app (Toaster / UI interna)

| Token         | HEX                          | Uso                                    |
| ------------- | ---------------------------- | -------------------------------------- |
| Toast bg      | `#252220`                    | Fundo do toast                         |
| Toast border  | `rgba(243,240,237,0.1)`      | Borda sutil do toast                   |
| Toast text    | `#f3f0ed`                    | Texto do toast                         |
| Sucesso       | `#a2dd00`                    | Indicador de sucesso (verde da marca)  |
| Erro          | `#f87171`                    | Indicador de erro                      |
| Action button | `#a2dd00` / texto `#1c1917`  | Botão dentro de toast                  |

### 2.3 Tokens shadcn (light + dark)

A base shadcn usa **OKLCH** com escala neutra. Resumo:

**Light (`:root`):**
- `--background: oklch(1 0 0)` (branco)
- `--foreground: oklch(0.145 0 0)` (quase preto)
- `--primary: oklch(0.205 0 0)`
- `--destructive: oklch(0.577 0.245 27.325)` (vermelho)

**Dark (`.dark`):**
- `--background: oklch(0.145 0 0)`
- `--foreground: oklch(0.985 0 0)`
- `--card: oklch(0.205 0 0)`
- `--border: oklch(1 0 0 / 10%)`
- `--destructive: oklch(0.704 0.191 22.216)`

> O app **internamente** opera em escala neutra (oklch). A **identidade da marca** (verde neon + off-white quente) é usada apenas na landing e em pontos de destaque (toasts, CTAs).

### 2.4 Charts (data viz)

**Dark:**
1. `oklch(0.488 0.243 264.376)` — azul/violeta
2. `oklch(0.696 0.17 162.48)` — verde água
3. `oklch(0.769 0.188 70.08)` — laranja
4. `oklch(0.627 0.265 303.9)` — magenta
5. `oklch(0.645 0.246 16.439)` — vermelho coral

---

## 3. Tipografia

### 3.1 Famílias

| Família           | Variável CSS    | Pesos disponíveis            | Uso                               |
| ----------------- | --------------- | ---------------------------- | --------------------------------- |
| **Inter**         | `--font-inter`  | 300, 400, 500, 600, 700, 800 | Tipografia principal (sans-serif) |
| **JetBrains Mono**| `--font-mono`   | 400, 500, 600, 700           | Code, `<pre>`, `<code>`, mono     |

Carregadas via `next/font/google` em `app/layout.tsx` com `display: "swap"`.

### 3.2 Stack de fallback

```css
font-family: var(--font-inter), system-ui, -apple-system, sans-serif;
font-family: var(--font-mono), 'JetBrains Mono', monospace;
```

### 3.3 Renderização

```css
font-feature-settings: "cv02", "cv03", "cv04", "cv11";
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

> As features `cv02–cv11` ativam variantes alternativas da Inter (números mais legíveis, `l` com cauda etc).

### 3.4 Hierarquia recomendada

| Nível        | Peso | Uso                                |
| ------------ | ---- | ---------------------------------- |
| Display / H1 | 700–800 | Hero da landing                  |
| H2           | 700  | Títulos de seção                   |
| H3           | 600  | Subtítulos / títulos de card       |
| Body         | 400  | Parágrafos                         |
| UI / Botão   | 500–600 | Labels, botões, navegação       |
| Caption      | 400  | Microcopy, legendas                |

---

## 4. Raios (border-radius)

Base shadcn com `--radius: 0.625rem` (10px) e escala derivada:

| Token         | Cálculo               | Valor   | Uso típico                |
| ------------- | --------------------- | ------- | ------------------------- |
| `--radius-sm` | `radius - 4px`        | 6px     | Inputs pequenos, badges   |
| `--radius-md` | `radius - 2px`        | 8px     | Botões, inputs            |
| `--radius-lg` | `radius`              | 10px    | Cards padrão              |
| `--radius-xl` | `radius + 4px`        | 14px    | Cards de destaque         |
| `--radius-2xl`| `radius + 8px`        | 18px    | Modais                    |
| `--radius-3xl`| `radius + 12px`       | 22px    | Hero cards, destaques     |
| `--radius-4xl`| `radius + 16px`       | 26px    | Containers grandes        |

Toasts usam `12px` e botões internos do toast `8px`.

---

## 5. Sombras e Glow

Sombra base de toast:
```css
box-shadow: 0 8px 24px rgba(0,0,0,0.4);
```

Glow do verde neon (animação `landing-glow-pulse`):
```css
0%, 100% { box-shadow: 0 0 20px rgba(162, 221, 0, 0.15); }
50%      { box-shadow: 0 0 40px rgba(162, 221, 0, 0.25); }
```

---

## 6. Animações de Marca

Definidas em `app/globals.css` e prefixadas com `landing-` para isolamento:

| Classe                  | Duração / Easing                | Uso                                       |
| ----------------------- | ------------------------------- | ----------------------------------------- |
| `.landing-float`        | 5s ease-in-out infinite         | Flutuação suave (Y -12px + leve rotação)  |
| `.landing-float-alt`    | 6s ease-in-out infinite         | Flutuação alternativa (Y +10px)           |
| `.landing-shimmer`      | 4s ease-in-out infinite         | Brilho diagonal verde sobre superfícies   |
| `.landing-glow-pulse`   | 3s ease-in-out infinite         | Pulso de glow verde                       |
| `.landing-noise`        | 8s steps(10) infinite           | Grão sutil (opacity 0.018) sobre seção    |
| `.navbar-fade-in`       | 0.8s cubic-bezier(.16,1,.3,1)   | Fade-in inicial da navbar                 |
| `.aside-in` / `-left`   | 0.22s cubic-bezier(.16,1,.3,1)  | Slide-in de painéis laterais              |
| `.aside-out-left`       | 0.2s cubic-bezier(.4,0,1,1)     | Slide-out de painéis laterais             |

Animações de loading orgânico (aurora):
- `fluid-blob-1` a `fluid-blob-4` — blobs animados com translate + rotate + scale.

Animações de gamificação (claim semanal):
- `claim-burst`, `claim-flash`, `claim-pop`, `claim-shake`, `claim-gift-bounce`.

---

## 7. Scrollbars Customizadas

Aplicadas em `.sidebar-scroll` e `<textarea>`:

```css
scrollbar-width: thin;
scrollbar-color: rgba(243, 240, 237, 0.07) transparent;
/* webkit */
::-webkit-scrollbar       { width: 3px; }
::-webkit-scrollbar-thumb { background: rgba(243,240,237,0.07); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: rgba(162, 221, 0, 0.25); }
```

Util `.no-scrollbar` para esconder completamente a barra.

---

## 8. Princípios de Design

1. **Dark mode first** — fundo `#141a1c`, texto off-white `#f3f0ed`.
2. **Verde neon `#a2dd00` é sagrado** — usar **somente** em CTAs primários, hovers de destaque, indicadores de sucesso e ícones de marca. Nunca em texto longo.
3. **Off-white quente `#f3f0ed`** — substitui o branco puro para reduzir contraste agressivo.
4. **Hierarquia por opacidade** — texto principal 100%, secundário 60%, muted 35%.
5. **Mobile-first** — maioria do tráfego vem de celular.
6. **Acentuação correta** — sempre. (Diferencial vs. concorrentes.)
7. **Animações com propósito** — float, shimmer e glow apenas em elementos-chave; nunca em massa.
8. **Performance** — imagens em WebP/AVIF, fontes via `next/font` com `display: swap`.

---

## 9. Snippet rápido (uso em componentes)

```tsx
// Botão CTA primário (landing)
<button className="bg-[var(--color-landing-accent)] hover:bg-[var(--color-landing-accent-hover)] text-[#1c1917] font-semibold rounded-xl px-6 py-3">
  Começar Grátis →
</button>

// Card padrão
<div className="bg-[var(--color-landing-card)] hover:bg-[var(--color-landing-card-hover)] border border-white/5 rounded-2xl p-6 text-[var(--color-landing-text)]">
  ...
</div>

// Texto secundário
<p className="text-[var(--color-landing-text-secondary)]">...</p>
```

---

*Última atualização: 2026-05-08 — extraído de `app/globals.css` e `app/layout.tsx`.*
