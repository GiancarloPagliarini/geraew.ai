'use client';

import Script from 'next/script';

/**
 * Meta Pixel (client-side). Dispara PageView automaticamente e grava os cookies
 * _fbp/_fbc que o CAPI usa para o match. Eventos de conversão (InitiateCheckout,
 * Purchase, CompleteRegistration) são disparados via lib/pixel.ts com o mesmo
 * event_id do servidor, para o Meta deduplicar browser + CAPI.
 *
 * Só renderiza se NEXT_PUBLIC_META_PIXEL_ID estiver configurado.
 */
export function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
