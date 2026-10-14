/** A-Z y 2-9 (sin 0, 1, O, I) — alineado con el backend (clienteId de 6 caracteres). */
const ALPHANUM = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomSegment(length: number): string {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return [...bytes].map((b) => ALPHANUM[b % ALPHANUM.length]).join("");
}

/**
 * Código público para /seguimiento y `codigoProyecto` al crear tareas.
 * Exactamente 6 caracteres en mayúsculas (A-Z, 2-9), sin prefijo K- ni guiones.
 */
export function generatePublicProjectCode(): string {
  return randomSegment(6);
}
