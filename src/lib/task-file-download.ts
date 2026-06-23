import type { TaskFile } from "@/lib/kanban";

function sanitizeDownloadFilename(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "-").trim();
  return base || "archivo";
}

/**
 * Descarga un archivo de tarea Kanban desde su data URL (`TaskFile.src`).
 * Sin `src` no hay datos persistidos (archivos viejos o error al leer).
 */
export function downloadTaskFile(file: TaskFile): boolean {
  if (typeof window === "undefined" || !file.src) {
    return false;
  }
  try {
    const link = document.createElement("a");
    link.href = file.src;
    link.download = sanitizeDownloadFilename(file.name);
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch {
    return false;
  }
}
