/**
 * Parser leve de user-agent para exibir dispositivo/SO/navegador nas Requisições.
 * Não é 100% exaustivo — cobre o que aparece em tráfego de anúncio (mobile,
 * navegadores in-app do Facebook/Instagram, etc.).
 */

export type ParsedUA = {
  device: 'Celular' | 'Desktop' | 'Tablet' | '—';
  os: string;
  browser: string;
};

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) return { device: '—', os: '—', browser: '—' };

  // OS
  let os = '—';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Device
  let device: ParsedUA['device'] = 'Desktop';
  if (/iPad|Tablet/i.test(ua)) device = 'Tablet';
  else if (/Mobi|Android|iPhone|iPod/i.test(ua)) device = 'Celular';

  // Browser (in-app primeiro — comum em tráfego pago)
  let browser = '—';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) browser = 'Facebook';
  else if (/Instagram/i.test(ua)) browser = 'Instagram';
  else if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung';
  else if (/CriOS|Chrome/i.test(ua)) browser = 'Chrome';
  else if (/FxiOS|Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';

  return { device, os, browser };
}
