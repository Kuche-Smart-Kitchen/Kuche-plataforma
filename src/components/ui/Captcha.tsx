"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

type CaptchaProps = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (errorCode?: string) => void;
  className?: string;
  siteKey?: string;
  disabled?: boolean;
};

export type CaptchaRef = {
  reset: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement | string, options: Record<string, unknown>) => string;
      getResponse?: (widgetId?: string) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const Captcha = forwardRef<CaptchaRef, CaptchaProps>(({
  onVerify,
  onExpire,
  onError,
  className,
  siteKey,
  disabled = false,
}, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  
  // Usamos la sitekey provista o la de producción. 
  // Opcional: Si quieres probar si el ciclo se rompe, puedes cambiar temporalmente 
  // la de producción por la genérica de pruebas de Cloudflare: "1x00000000000000000000AA"
  const resolvedSiteKey = siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current && window.turnstile?.reset) {
        window.turnstile.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || widgetIdRef.current) return;

      if (window.turnstile) {
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: resolvedSiteKey,
            theme: "light",
            callback: (token: string) => {
              if (isMounted) onVerify(token);
            },
            "expired-callback": () => {
              if (isMounted) onExpire?.();
            },
            "error-callback": (errorCode?: string) => {
              if (isMounted) onError?.(errorCode);
            },
          });
        } catch (err) {
          console.error("Error al renderizar Turnstile:", err);
          onError?.("render-exception");
        }
      }
    };

    // Si el script global ya existe, renderizamos directamente
    if (window.turnstile) {
      renderWidget();
    } else {
      // Si no existe, lo cargamos una sola vez de forma segura
      const scriptId = "cloudflare-turnstile-script";
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      script.onload = () => {
        renderWidget();
      };
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignorar errores de limpieza
        }
        widgetIdRef.current = null;
      }
    };
  }, []); // Dependencias vacías [ ] para evitar que el componente se destruya y se vuelva a ciclar al cambiar estados

  return (
    <div
      ref={containerRef}
      className={`${className ?? "min-h-[65px] w-full flex justify-center items-center"}${disabled ? " pointer-events-none opacity-60" : ""}`}
    />
  );
});

Captcha.displayName = "Captcha";

export default Captcha;