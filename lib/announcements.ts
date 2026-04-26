/**
 * Registry central de avisos exibidos no workspace.
 *
 * Como adicionar um novo aviso:
 *   1. Adicione um novo objeto no array ANNOUNCEMENTS
 *   2. Use um `id` único e PERMANENTE — nunca reaproveite
 *   3. Convenção: {feature}-{action}-{yyyy-mm} (ex: 'voice-clone-launch-2026-05')
 *
 * Como remover um aviso:
 *   - Remova do array e pronto. A flag no localStorage de quem viu fica órfã,
 *     mas é inofensiva (uns bytes). Não reaproveite o `id` removido.
 */

export type AnnouncementVariant = 'feature' | 'maintenance' | 'promo' | 'openai';

/** Ações que o botão CTA pode disparar. Se omitido, o CTA apenas fecha o modal. */
export type AnnouncementAction =
  | { type: 'open-image-panel' }
  | { type: 'open-video-panel' }
  | { type: 'href'; url: string };

export interface Announcement {
  id: string;
  variant?: AnnouncementVariant;
  badge?: string;
  title: string;
  description: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaAction?: AnnouncementAction;
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'gpt-image-2-launch-2026-04',
    variant: 'openai',
    badge: 'NOVO MODELO',
    title: 'Ouvimos seu feedback e trouxemos o GPT Image 2 ao Geraew!',
    description:
      'O novo modelo de imagem da OpenAI já está disponível no painel de gerar imagem. Suporta texto-pra-imagem e edição com referências, em 1K, 2K e 4K.',
    imageUrl:
      'https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/admin_assets/landing/ea2bc984-8267-48ab-bf11-e56cc8ffaa2e/geraew-ai__30_.jpg',
    ctaLabel: 'Quero testar',
    ctaAction: { type: 'open-image-panel' },
  },
];
