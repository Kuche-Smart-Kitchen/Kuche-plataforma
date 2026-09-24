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

    const initTurnstile = () => {
      if (!isMounted || !containerRef.current) return;

      // Si ya existe un widget previo en este contenedor, lo limpiamos
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignorar si ya fue removido
        }
        widgetIdRef.current = null;
      }

      // Validar que el script global de Cloudflare esté cargado
      if (window.turnstile && containerRef.current) {
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

    // Comprobamos si el script ya está en el DOM, si no, lo inyectamos de forma segura
    if (!window.turnstile) {
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
        // Dar un pequeño respiro para que el objeto global esté listo
        const interval = setInterval(() => {
          if (window.turnstile && isMounted) {
            clearInterval(interval);
            initTurnstile();
          }
        }, 100);
      };
    } else {
      initTurnstile();
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Evitar fugas o errores al desmontar
        }
        widgetIdRef.current = null;
      }
    };
  }, [resolvedSiteKey, onVerify, onExpire, onError]);

  return (
    <div
      ref={containerRef}
      className={`${className ?? "min-h-[65px] w-full flex justify-center items-center"}${disabled ? " pointer-events-none opacity-60" : ""}`}
    />
  );
});

Captcha.displayName = "Captcha";

export default Captcha;