import type { Kind } from '@/components/gallery/kind';

/** extensão de arquivo conforme o tipo da criação */
export function mediaExtension(kind: Kind): string {
  if (kind === 'voice') return 'mp3';
  if (kind === 'video' || kind === 'avatar') return 'mp4';
  return 'jpg';
}

/**
 * Baixa uma mídia da galeria/criações. Passa pelo proxy same-origin para forçar
 * o download (o atributo `download` é ignorado em URLs cross-origin do S3/CDN).
 */
export function downloadMedia(url: string, kind: Kind) {
  const filename = `geraew-ai.${mediaExtension(kind)}`;
  const a = document.createElement('a');
  a.href = `/api/proxy-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
