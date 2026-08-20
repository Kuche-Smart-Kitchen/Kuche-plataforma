"use client";

import { useEffect, useRef } from "react";
import { loadTurnstileScript } from "@/lib/load-turnstile-script";
import { env } from "@/lib/env";

type CaptchaProps = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
  siteKey?: string;
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

const resolveSiteKey = (siteKey?: string): string =>
  siteKey?.trim() || env.turnstileSiteKey;

export default function Captcha({
  onVerify,
  onExpire,
  onError,
  className,
  siteKey,
}: CaptchaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const resolvedSiteKey = resolveSiteKey(siteKey);

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
        callback: (token: string) => onVerify(token),
        "expired-callback": () => onExpire?.(),
        "error-callback": () => onError?.(),
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
        onError?.();
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [resolvedSiteKey, onVerify, onExpire, onError]);

  return (
    <div
      ref={containerRef}
      className={className ?? "min-h-[65px] w-full"}
      aria-label="Verificación de seguridad Cloudflare Turnstile"
    />
  );
}
