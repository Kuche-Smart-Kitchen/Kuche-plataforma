export const LOCAL_LOGIN_CAPTCHA_BYPASS = "local-bypass";

/** Solo desarrollo local: no exige Turnstile en la pantalla de login. */
export function isLocalLoginCaptchaBypass(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}
