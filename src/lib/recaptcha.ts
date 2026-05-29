/**
 * Utilidades para Cloudflare Turnstile
 * Obtiene tokens para proteger formularios públicos
 */

/**
 * Renderizar widget de Cloudflare Turnstile
 * @param containerId - ID del elemento div donde renderizar el widget
 */
export const renderTurnstile = async (containerId: string): Promise<void> => {
  try {
    if (!window.turnstile) {
      console.error("Cloudflare Turnstile no está cargado");
      return;
    }

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      console.error("NEXT_PUBLIC_TURNSTILE_SITE_KEY no está configurada");
      return;
    }

    // Esperar a que Turnstile esté listo
    return new Promise((resolve) => {
      window.turnstile?.render(
        document.getElementById(containerId) || document.createElement('div'),
        {
          sitekey: siteKey,
          theme: "light",
          size: "normal",
        }
      );
      resolve();
    });
  } catch (error) {
    console.error("Error renderizando Turnstile:", error);
  }
};

/**
 * Obtener token de Cloudflare Turnstile
 * @param containerId - ID del elemento donde está el widget
 * @returns Token de Turnstile
 */
export const obtenerTokenTurnstile = (containerId: string): string => {
  try {
    if (!window.turnstile?.getResponse) {
      console.error("Cloudflare Turnstile no está disponible o getResponse no existe");
      return "";
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Contenedor con ID ${containerId} no encontrado`);
      return "";
    }

    const token = window.turnstile.getResponse(container);
    return token || "";
  } catch (error) {
    console.error("Error obteniendo token Turnstile:", error);
    return "";
  }
};

/**
 * Resetear widget de Turnstile
 * @param containerId - ID del elemento donde está el widget
 */
export const resetTurnstile = (containerId: string): void => {
  try {
    if (!window.turnstile?.reset) {
      return;
    }
    const container = document.getElementById(containerId);
    if (container) {
      window.turnstile.reset(container);
    }
  } catch (error) {
    console.error("Error reseteando Turnstile:", error);
  }
};

/**
 * Verificar si Turnstile está disponible
 */
export const isTurnstileAvailable = (): boolean => {
  return typeof window !== "undefined" && !!window.turnstile;
};

