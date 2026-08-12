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

export const env = {
  apiUrl: readEnv("NEXT_PUBLIC_API_URL"),
  backendApiUrl: readEnv("BACKEND_API_URL") || readEnv("NEXT_PUBLIC_API_URL"),
  fileUploadEndpoint: readEnv("NEXT_PUBLIC_FILE_UPLOAD_ENDPOINT"),
  turnstileSiteKey: readEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY"),
  showroomAddress: readEnv("NEXT_PUBLIC_SHOWROOM_ADDRESS"),
  googleMapsEmbedSrc: readEnv("NEXT_PUBLIC_GOOGLE_MAPS_EMBED_SRC"),
  metaGraphVersion: readEnv("META_GRAPH_VERSION") || "v22.0",
  metaOEmbedAccessToken: readEnv("META_OEMBED_ACCESS_TOKEN"),
  metaAppId: readEnv("META_APP_ID"),
  metaAppClientToken: readEnv("META_APP_CLIENT_TOKEN"),
  nodeEnv: readEnv("NODE_ENV") || "development",
};
