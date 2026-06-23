"use client";

import { useEffect, useRef } from "react";
import { loadTurnstileScript } from "@/lib/load-turnstile-script";

type CaptchaProps = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
};

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove?: (widgetId: string) => void;
    };
  }
}

export default function Captcha({
  onVerify,
  onExpire,
  onError,
  className,
}: CaptchaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;
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
        sitekey: siteKey,
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
  }, [onVerify, onExpire, onError]);

  if (!siteKey) {
    return (
      <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
        <p>Configura NEXT_PUBLIC_TURNSTILE_SITE_KEY para habilitar el captcha real.</p>
        <button
          type="button"
          className="rounded-lg bg-amber-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-amber-700"
          onClick={() => onVerify("dev-captcha-token")}
        >
          Simular captcha (solo desarrollo)
        </button>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
