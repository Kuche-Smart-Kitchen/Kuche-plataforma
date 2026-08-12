export const runtimeConfigWarnings: string[] = [];

export function assertRuntimeConfig() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || "";
  if (!apiUrl) {
    runtimeConfigWarnings.push("Falta NEXT_PUBLIC_API_URL o BACKEND_API_URL");
  }

  if (typeof window !== "undefined") {
    console.info("[runtime-config] API target", apiUrl || "not-set");
  }
}

if (typeof window === "undefined") {
  assertRuntimeConfig();
}
