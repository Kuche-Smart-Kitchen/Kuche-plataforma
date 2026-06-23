/**
 * Contacto institucional (PDF formal / preliminar y pie de página web).
 * Un solo lugar para teléfono y correo.
 */

/** Texto del teléfono en PDF formal (sin prefijo internacional). */
export const KUCHE_PHONE_LOCAL = "618 101 7363";

/** Teléfono para mostrar en web (footer, etc.). */
export const KUCHE_PHONE_DISPLAY = "+52 618 101 7363";

export const KUCHE_PHONE_TEL_HREF = "tel:+526181017363";
export const KUCHE_WHATSAPP_PHONE_E164 = "526181017363";
export const KUCHE_WHATSAPP_DEFAULT_MESSAGE =
  "Hola, me gustaria cotizar una cocina con Kueche.";
export const KUCHE_WHATSAPP_HREF = `https://wa.me/${KUCHE_WHATSAPP_PHONE_E164}?text=${encodeURIComponent(KUCHE_WHATSAPP_DEFAULT_MESSAGE)}`;

export const KUCHE_EMAIL = "cocinasinteligentesdgo@gmail.com";

export const KUCHE_EMAIL_MAILTO_HREF = `mailto:${KUCHE_EMAIL}`;

/** Dirección en pie de PDF formal / preliminar (histórica; el mapa de la web usa `site-location`). */
export const KUCHE_PDF_FOOTER_ADDRESS = "Copal No. 303 Fracc. Vista Hermosa";

/** Una línea (preliminar y similares). */
export const KUCHE_PRELIMINAR_PDF_FOOTER_LINE = `${KUCHE_PDF_FOOTER_ADDRESS} Tel. ${KUCHE_PHONE_LOCAL} | ${KUCHE_EMAIL}`;

/** Primera línea del pie del PDF formal en cotizador (dos líneas). */
export const KUCHE_FORMAL_PDF_FOOTER_LINE_1 = `${KUCHE_PDF_FOOTER_ADDRESS} · Tel. ${KUCHE_PHONE_LOCAL}`;
