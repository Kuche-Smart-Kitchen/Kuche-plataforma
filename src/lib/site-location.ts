/**
 * Ubicación del showroom (landing, mapa, pie de página).
 *
 * Por defecto se usa el embed oficial de Google Maps (Compartir → Insertar un mapa).
 * Para otra URL o dirección sin tocar código, define en `.env.local`:
 *
 * ```
 * NEXT_PUBLIC_GOOGLE_MAPS_EMBED_SRC=https://www.google.com/maps/embed?pb=...
 * NEXT_PUBLIC_SHOWROOM_ADDRESS=Tu calle, ciudad…
 * ```
 */

/** Embed oficial: Av Universidad España 119, Durango (Google Maps). */
const DEFAULT_GOOGLE_MAPS_EMBED_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3643.4652309980893!2d-104.6289491858984!3d24.04991613070162!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x869bb7b35b0d75f5%3A0xada9e998478f9d40!2sAv%20Universidad%20Espa%C3%B1a%20119%2C%20Cd%20Industrial%2C%20Espa%C3%B1ol%2C%2034209%20Durango%2C%20Dgo.!5e0!3m2!1ses-419!2smx!4v1775798742158!5m2!1ses-419!2smx";

export const SHOWROOM_ADDRESS_LINE =
  process.env.NEXT_PUBLIC_SHOWROOM_ADDRESS?.trim() ||
  "Av Universidad España 119, Cd Industrial, Español, 34209 Durango, Dgo.";

/** URL para abrir la dirección en la app de Google Maps (nueva pestaña). */
export function getGoogleMapsSearchUrl(): string {
  const q = encodeURIComponent(SHOWROOM_ADDRESS_LINE);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function getGoogleMapsEmbedSrc(): string {
  const custom = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_SRC?.trim();
  if (custom) return custom;
  return DEFAULT_GOOGLE_MAPS_EMBED_SRC;
}
