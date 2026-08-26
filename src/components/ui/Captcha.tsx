"use client";

import { useEffect, useRef } from "react";
import { loadTurnstileScript } from "@/lib/load-turnstile-script";
import { env } from "@/lib/env";

type CaptchaProps = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (errorCode?: string) => void;
  className?: string;
  siteKey?: string;
  disabled?: boolean;
};

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

const resolveSiteKey = (siteKey?: string): string => {
  if (siteKey?.trim()) return siteKey.trim();

  const isDevelopment =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_TURNSTILE_MODE === "development";

  if (isDevelopment) return "1x00000000000000000000AA";

  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || env.turnstileSiteKey;
};

export default function Captcha({
  onVerify,
  onExpire,
  onError,
  className,
  siteKey,
  disabled = false,
}: CaptchaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onVerify, onExpire, onError });
  const resolvedSiteKey = resolveSiteKey(siteKey);

  useEffect(() => {
    callbacksRef.current = { onVerify, onExpire, onError };
  }, [onVerify, onExpire, onError]);

  useEffect(() => {
    let cancelled = false;

    const renderWidget = () => {
      if (
        cancelled ||
        widgetIdRef.current ||
        !containerRef.current ||
        !window.turnstile
      ) {
        return;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: resolvedSiteKey,
        theme: "light",
        callback: (token: string) => callbacksRef.current.onVerify(token),
        "expired-callback": () => callbacksRef.current.onExpire?.(),
        "error-callback": (errorCode?: string) => callbacksRef.current.onError?.(errorCode),
      });
    };

    const tick = () => {
      if (cancelled) return;
      renderWidget();
      if (!widgetIdRef.current) {
        setTimeout(tick, 250);
      }
    };

    loadTurnstileScript()
      .then(() => {
        if (!cancelled) tick();
      })
      .catch(() => {
        callbacksRef.current.onError?.("script-load-error");
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [resolvedSiteKey]);

  return (
    <div
      ref={containerRef}
      aria-disabled={disabled}
      className={`${className ?? "min-h-[65px] w-full"}${disabled ? " pointer-events-none opacity-60" : ""}`}
      aria-label="Verificación de seguridad Cloudflare Turnstile"
    />
  );
}
