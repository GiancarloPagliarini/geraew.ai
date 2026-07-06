/**
 * Helpers para disparar eventos do Meta Pixel no navegador.
 *
 * Regra de dedup: sempre que o mesmo evento também for enviado pelo servidor
 * (CAPI), passe o MESMO `eventId` nos dois lados. Para Purchase, o eventId é o
 * id do checkout do gateway (session_id do Stripe / paymentId do PIX) — o mesmo
 * usado como orderId no backend.
 */

type PixelParams = Record<string, unknown>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function track(event: string, params?: PixelParams, eventId?: string): void {
  if (typeof window === 'undefined') return;
  if (typeof window.fbq !== 'function') {
    // eslint-disable-next-line no-console
    console.warn(`[GeraEW Pixel] fbq indisponível — evento ${event} NÃO enviado (Pixel não carregou? NEXT_PUBLIC_META_PIXEL_ID setado?)`);
    return;
  }
  const options = eventId ? { eventID: eventId } : undefined;
  window.fbq('track', event, params ?? {}, options);
  // eslint-disable-next-line no-console
  console.debug(
    `[GeraEW Pixel] ▶ ${event}`,
    { eventID: eventId ?? '(sem dedup)', ...params },
  );
}

export function trackInitiateCheckout(params: {
  valueBRL?: number;
  contentId: string;
  contentName?: string;
}): void {
  const custom: PixelParams = {
    currency: 'BRL',
    content_ids: [params.contentId],
    content_type: 'product',
  };
  if (typeof params.valueBRL === 'number') custom.value = params.valueBRL;
  if (params.contentName) custom.content_name = params.contentName;
  track('InitiateCheckout', custom);
}

export function trackPurchase(params: {
  eventId: string;
  valueBRL?: number;
  contentId?: string;
  contentName?: string;
}): void {
  // value/content são opcionais: na página de sucesso do Stripe não temos o valor
  // à mão — o CAPI (mesmo eventId) carrega o valor autoritativo e o Meta deduplica.
  const custom: PixelParams = { currency: 'BRL' };
  if (typeof params.valueBRL === 'number') custom.value = params.valueBRL;
  if (params.contentId) {
    custom.content_ids = [params.contentId];
    custom.content_type = 'product';
  }
  if (params.contentName) custom.content_name = params.contentName;
  track('Purchase', custom, params.eventId);
}

export function trackCompleteRegistration(): void {
  track('CompleteRegistration');
}
