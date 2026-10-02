/**
 * O modo ilimitado foi descontinuado. O código continua no projeto, mas toda
 * a interface (toggle, badges, custo "Ilimitado", modal de upgrade) fica
 * desligada e nenhuma geração envia `unlimited: true`. A API também recusa
 * esses pedidos (403 UNLIMITED_DISABLED) enquanto UNLIMITED_ENABLED != true.
 */
export const UNLIMITED_MODE_ENABLED = false;
