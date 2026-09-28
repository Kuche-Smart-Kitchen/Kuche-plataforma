import type { TaskFile } from "@/lib/kanban";

function sanitizeDownloadFilename(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "-").trim();
  return base || "archivo";
}

/**
 * Descarga un archivo de tarea Kanban desde su URL (`TaskFile.src`).
 */
export async function downloadTaskFile(file: TaskFile): Promise<boolean> {
  if (typeof window === "undefined" || !file.src) {
    return false;
  }

  const filename = sanitizeDownloadFilename(file.name) || "diseno.jpg";

  try {
    const response = await fetch(file.src, { mode: "cors" });
    if (!response.ok) throw new Error("Network response was not ok");
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
    return true;
  } catch (error) {
    console.warn("Descarga por Blob falló, intentando fallback seguro:", error);
    const link = document.createElement("a");
    link.href = file.src;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  }
}
