// TODO(workspaces): trocar pelos dados reais quando o endpoint de listagem
// existir no backend (hoje o canvas persiste apenas em localStorage).
// A estrutura abaixo já espelha o que a tela precisa renderizar.

export interface WorkspaceItem {
  id: string;
  /** vazio → exibe "Sem título" */
  title: string;
  /** thumbnail real quando houver; sem ela o card mostra o placeholder */
  thumbnailUrl?: string;
  favorite: boolean;
  updatedAt: string;
}

export const MOCK_WORKSPACES: WorkspaceItem[] = [
  { id: 'w1', title: '', favorite: false, updatedAt: '2026-03-12T10:00:00Z' },
  { id: 'w2', title: '', favorite: false, updatedAt: '2026-04-12T10:00:00Z' },
];
