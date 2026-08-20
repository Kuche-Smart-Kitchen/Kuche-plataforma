const readEnv = (key: string): string => {
  const candidates: Array<string | undefined> = [];

  if (typeof process !== "undefined" && process.env) {
    candidates.push(process.env[key]);
  }

  const globalWithProcess = globalThis as typeof globalThis & {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };

  if (globalWithProcess.process?.env) {
    candidates.push(globalWithProcess.process.env[key]);
  }

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) return trimmed;
    }
  }

  return "";
};

/** Site Key de producción de Cloudflare Turnstile (fallback si no hay env). */
export const TURNSTILE_SITE_KEY_DEFAULT = "0x4AAAAAAC5tkCTPmiBULbEx";

const resolveTurnstileSiteKey = (): string =>
  readEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY") || TURNSTILE_SITE_KEY_DEFAULT;

/** Resuelve una sola URL de backend (sin listas separadas por coma). */
export function resolveBackendApiUrl(): string {
  const raw = readEnv("BACKEND_API_URL") || readEnv("NEXT_PUBLIC_API_URL");
  if (!raw) return "";

  const candidates = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!candidates.length) return "";
  if (candidates.length === 1) return candidates[0];

  const localhostCandidates = candidates.filter(
    (value) =>
      value.includes("localhost") ||
      value.includes("127.0.0.1") ||
      value.includes("0.0.0.0"),
  );

  const nodeEnv = readEnv("NODE_ENV") || "development";
  const isProduction = nodeEnv === "production" || readEnv("VERCEL") === "1";

  if (isProduction) {
    const remoteCandidate = candidates.find((value) => !localhostCandidates.includes(value));
    return remoteCandidate ?? candidates[candidates.length - 1];
  }

  return localhostCandidates[0] ?? candidates[0];
}

export const env = {
  apiUrl: readEnv("NEXT_PUBLIC_API_URL"),
  backendApiUrl: resolveBackendApiUrl(),
  fileUploadEndpoint: readEnv("NEXT_PUBLIC_FILE_UPLOAD_ENDPOINT"),
  turnstileSiteKey: resolveTurnstileSiteKey(),
  showroomAddress: readEnv("NEXT_PUBLIC_SHOWROOM_ADDRESS"),
  googleMapsEmbedSrc: readEnv("NEXT_PUBLIC_GOOGLE_MAPS_EMBED_SRC"),
  metaGraphVersion: readEnv("META_GRAPH_VERSION") || "v22.0",
  metaOEmbedAccessToken: readEnv("META_OEMBED_ACCESS_TOKEN"),
  metaAppId: readEnv("META_APP_ID"),
  metaAppClientToken: readEnv("META_APP_CLIENT_TOKEN"),
  nodeEnv: readEnv("NODE_ENV") || "development",
};
