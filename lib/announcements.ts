/**
 * Tipos compartilhados de avisos.
 *
 * O array de avisos vivia aqui antes — agora ele é gerenciado pelo backend
 * via `/admin/avisos`. Veja `Announcement` em `lib/api.ts`.
 */

export type {
  Announcement,
  AnnouncementAction,
  AnnouncementVariant,
} from '@/lib/api';
