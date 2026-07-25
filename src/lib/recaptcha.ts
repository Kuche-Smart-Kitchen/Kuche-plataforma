declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      getResponse?: (container: HTMLElement) => string;
      reset?: (container: HTMLElement) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

export const renderTurnstile = async (containerId: string): Promise<void> => {
  try {
    if (!window.turnstile) {
      console.error("Cloudflare Turnstile no esta cargado");
      return;
    }

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      console.error("NEXT_PUBLIC_TURNSTILE_SITE_KEY no esta configurada");
      return;
    }

    return new Promise((resolve) => {
      window.turnstile?.render(document.getElementById(containerId) || document.createElement("div"), {
        sitekey: siteKey,
        theme: "light",
        size: "normal",
      });
      resolve();
    });
  } catch (error) {
    console.error("Error renderizando Turnstile:", error);
  }
};

export const obtenerTokenTurnstile = (containerId: string): string => {
  try {
    if (!window.turnstile?.getResponse) {
      console.error("Cloudflare Turnstile no esta disponible o getResponse no existe");
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

export const isTurnstileAvailable = (): boolean => {
  return typeof window !== "undefined" && !!window.turnstile;
};