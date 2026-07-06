'use client';

import Script from 'next/script';

/**
 * Script de UTMs da UTMfy. Lê os parâmetros de UTM da URL e os persiste ao longo
 * da navegação (carrega os UTMs pelo funil até o checkout). Complementa nossa
 * captura first-party em lib/tracking.ts — não precisa de pixelId.
 *
 * Os atributos data-utmify-prevent-* desligam os subids/xcod que não usamos.
 */
export function UtmfyScripts() {
  return (
    <Script
      id="utmify-utms"
      src="https://cdn.utmify.com.br/scripts/utms/latest.js"
      strategy="afterInteractive"
      data-utmify-prevent-xcod-sck=""
      data-utmify-prevent-subids=""
    />
  );
}
