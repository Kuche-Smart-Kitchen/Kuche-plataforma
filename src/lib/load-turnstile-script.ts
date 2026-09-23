/** Carga única del script de Cloudflare Turnstile (solo cuando hace falta el captcha). */
const TURNSTILE_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  const w = window as Window & { turnstile?: unknown };
  if (w.turnstile) {
    return Promise.resolve();
  }
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_URL}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.turnstile) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile script error")), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TURNSTILE_URL;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Turnstile script failed to load"));
    document.body.appendChild(s);
  });
}
