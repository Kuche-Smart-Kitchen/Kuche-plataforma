/** Convierte un link compartido de Dropbox (`dl=0`) en uno de contenido directo, apto para `<img src>`. */
export function toDropboxDirectImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("dropbox.com")) return url;

    parsed.searchParams.delete("dl");
    parsed.searchParams.set("raw", "1");
    return parsed.toString();
  } catch {
    return url;
  }
}
