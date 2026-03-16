# Refatorar VideoEditorDialog — Melhorar o Trim/Corte de Vídeo

O componente [VideoEditorDialog.tsx](file:///c:/Users/gianc/OneDrive/%C3%81rea%20de%20Trabalho/geraew-ai/geraew.ai/components/editor/VideoEditorDialog.tsx) é um componente monolítico de ~1200 linhas que contém o player de vídeo, timeline, trim handles e um gallery picker tudo junto. Vamos refatorá-lo para melhorar a organização e principalmente a UX do **trim/corte** de vídeo.

## Mudanças propostas

### [MODIFY] [VideoEditorDialog.tsx](file:///c:/Users/gianc/OneDrive/%C3%81rea%20de%20Trabalho/geraew-ai/geraew.ai/components/editor/VideoEditorDialog.tsx)

#### 1. Extrair sub-componentes para arquivos separados

Mover cada sub-componente interno para seu próprio arquivo dentro de `components/editor/video-editor/`:

| Componente | Arquivo | Responsabilidade |
|---|---|---|
| [ClipFrames](file:///c:/Users/gianc/OneDrive/%C3%81rea%20de%20Trabalho/geraew-ai/geraew.ai/components/editor/VideoEditorDialog.tsx#901-989) | `ClipFrames.tsx` | Gera filmstrip a partir de frames do vídeo |
| [TrimHandle](file:///c:/Users/gianc/OneDrive/%C3%81rea%20de%20Trabalho/geraew-ai/geraew.ai/components/editor/VideoEditorDialog.tsx#992-1076) | `TrimHandle.tsx` | Handle de trim esquerdo/direito |
| [VideoGalleryPicker](file:///c:/Users/gianc/OneDrive/%C3%81rea%20de%20Trabalho/geraew-ai/geraew.ai/components/editor/VideoEditorDialog.tsx#1079-1192) | `VideoGalleryPicker.tsx` | Seletor de vídeos da galeria |
| `VideoTimeline` | `VideoTimeline.tsx` | Barra de timeline com clips |
| `VideoPlayer` | `VideoPlayer.tsx` | Player com controles customizados |
| `TrimPanel` | `TrimPanel.tsx` | **[NOVO]** Painel dedicado para trim preciso |

#### 2. Melhorar UX do Trim/Corte

Hoje o trim funciona somente através de handles minúsculos nas bordas do clip na timeline. Isso é difícil de usar. As melhorias:

**a) Painel de Trim dedicado (`TrimPanel.tsx`)**
- Aparece quando o usuário seleciona um clip na timeline
- Exibe uma miniatura do vídeo com preview do ponto de corte
- Inputs numéricos para `startMs` e `endMs` com formatação `mm:ss.ms`
- Slider duplo (range slider) para ajuste visual do trim range
- Preview em tempo real: ao arrastar os sliders, o vídeo pula para aquele frame
- Botão de reset para restaurar duração original
- Exibe a duração trimada resultante

**b) Melhorar TrimHandle existente**
- Handles maiores e mais visíveis (mais largos com ícone de grip)
- Tooltip mostrando o tempo atual enquanto arrasta
- Snap a cada 100ms para precisão
- Feedback visual mais claro: a região dimmed fica mais evidente
- Animação suave durante o drag

**c) Player com preview do trim**
- Ao ajustar trim, o vídeo automaticamente navega para o ponto de corte
- Loop visual: quando em "modo trim", o vídeo reproduz apenas o trecho selecionado

#### 3. Limpar o componente principal

- Extrair custom hooks: `useVideoPlayer`, `useTimeline`, `useClipManager`
- Remover lógica inline complexa (ex: `switchToClip`, `seekToGlobal`) para hooks dedicados
- Simplificar o JSX removendo nested ternários profundos

---

## Resumo de arquivos

#### [MODIFY] [VideoEditorDialog.tsx](file:///c:/Users/gianc/OneDrive/%C3%81rea%20de%20Trabalho/geraew-ai/geraew.ai/components/editor/VideoEditorDialog.tsx)
- Remover sub-componentes inline ([ClipFrames](file:///c:/Users/gianc/OneDrive/%C3%81rea%20de%20Trabalho/geraew-ai/geraew.ai/components/editor/VideoEditorDialog.tsx#901-989), [TrimHandle](file:///c:/Users/gianc/OneDrive/%C3%81rea%20de%20Trabalho/geraew-ai/geraew.ai/components/editor/VideoEditorDialog.tsx#992-1076), [VideoGalleryPicker](file:///c:/Users/gianc/OneDrive/%C3%81rea%20de%20Trabalho/geraew-ai/geraew.ai/components/editor/VideoEditorDialog.tsx#1079-1192))
- Extrair lógica de player para hook `useVideoPlayer`
- Adicionar o `TrimPanel` quando um clip é selecionado
- Import dos novos sub-componentes

#### [NEW] `components/editor/video-editor/ClipFrames.tsx`
- Mover código existente de geração de filmstrip para cá

#### [NEW] `components/editor/video-editor/TrimHandle.tsx`
- Mover código existente + melhorar com handles maiores, tooltip de tempo, e snap

#### [NEW] `components/editor/video-editor/VideoGalleryPicker.tsx`
- Mover código existente do picker para cá

#### [NEW] `components/editor/video-editor/TrimPanel.tsx`
- Novo painel de trim com inputs numéricos, range slider e preview

#### [NEW] `components/editor/video-editor/useVideoPlayer.ts`
- Custom hook com toda a lógica de playback: play/pause, seek, switchToClip, timeupdate handler

---

## Verification Plan

### Manual Verification
Como este é um componente de UI sem testes automatizados no projeto, a verificação será manual:

1. **Abrir o editor de vídeo** no browser (`npm run dev` já está rodando)
2. **Criar um projeto** e adicionar clips da galeria
3. **Selecionar um clip** na timeline → verificar que o `TrimPanel` aparece
4. **Testar o trim via inputs** → digitar valores de start/end, verificar que o vídeo atualiza
5. **Testar o trim via range slider** → arrastar os handles, verificar preview do vídeo
6. **Testar os trim handles na timeline** → verificar que estão maiores e mais fáceis de usar
7. **Play/pause** → verificar que o vídeo respeita os pontos de trim
8. **Verificar que o build compila** sem erros: `npm run build`

> [!NOTE]
> O projeto não possui testes automatizados para componentes de UI. A verificação será feita manualmente no navegador e por build check.
