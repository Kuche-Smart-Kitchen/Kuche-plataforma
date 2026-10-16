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

const PERSISTED_CODE_KEYS = [
  "clienteId",
  "codigo",
  "codigoProyecto",
  "codigoCliente",
  "clientId",
] as const;

const NESTED_CODE_RECORDS = ["tarea", "task", "data", "cliente", "proyecto", "cita"] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/**
 * Lee el código público que Mongo devolvió en un alta o en un item de Kanban.
 * No usa `_id`: ese valor es el ObjectId, no el código de 6 caracteres.
 */
export function readPersistedPublicCode(payload: unknown, depth = 0): string | undefined {
  const record = asRecord(payload);
  if (!record || depth > 3) return undefined;

  for (const key of PERSISTED_CODE_KEYS) {
    const value = record[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }

  for (const key of NESTED_CODE_RECORDS) {
    const nested = readPersistedPublicCode(record[key], depth + 1);
    if (nested) return nested;
  }

  return undefined;
}
