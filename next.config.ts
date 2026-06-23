import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** Ruta a una carpeta dentro de `node_modules` (sin `require.resolve`, por “exports” de algunos paquetes). */
function nm(pkg: string): string {
  return path.join(projectRoot, "node_modules", ...pkg.split("/"));
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      tailwindcss: nm("tailwindcss"),
      "@tailwindcss/postcss": nm("@tailwindcss/postcss"),
    },
  },
  images: {
    /** Sustituciones con el mismo nombre en `public/images` se reflejan mejor (menos caché agresivo del optimizador). */
    minimumCacheTTL: 0,
    localPatterns: [{ pathname: "/images/**" }],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
    ],
  },
};

export default nextConfig;
