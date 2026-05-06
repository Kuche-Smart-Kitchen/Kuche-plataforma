/**
 * Almacena PDFs en IndexedDB (no saturar localStorage): formal, taller y levantamiento→seguimiento.
 * Tarjeta / seguimiento guardan claves; el blob se lee aquí al ver/descargar.
 */

const DB_NAME = "kuche-formal-pdfs";
const STORE_NAME = "pdfs";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/** Guarda el PDF formal (data URL) bajo la clave dada. */
export function saveFormalPdf(key: string, dataUrl: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(dataUrl, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

/** Recupera el PDF formal por clave. Devuelve null si no existe o hay error. */
export function getFormalPdf(key: string): Promise<string | null> {
  return openDb()
    .then(
      (db) =>
        new Promise<string | null>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readonly");
          const store = tx.objectStore(STORE_NAME);
          const request = store.get(key);
          request.onsuccess = () => resolve(request.result ?? null);
          request.onerror = () => reject(request.error);
          tx.oncomplete = () => db.close();
        }),
    )
    .catch(() => null);
}

/**
 * Genera claves emparejadas (mismo sufijo) para formal y taller.
 * Así, si `workshopPdfKey` no llegó en JSON, se puede recuperar desde `formalPdfKey`.
 */
export function createFormalWorkshopPdfKeys(
  taskId: string,
  index: number,
): { formalPdfKey: string; workshopPdfKey: string } {
  const suffix = `${taskId}-${index}-${Date.now()}`;
  return {
    formalPdfKey: `formal-${suffix}`,
    workshopPdfKey: `workshop-${suffix}`,
  };
}

/** Deriva la clave de taller emparejada con una clave formal (mismo sufijo tras el prefijo). */
export function inferWorkshopPdfKeyFromFormalPdfKey(formalPdfKey: string): string {
  return formalPdfKey.replace(/^formal-/, "workshop-");
}

export function resolveWorkshopPdfKeysToTry(data: {
  formalPdfKey?: string;
  workshopPdfKey?: string;
}): string[] {
  const keys: string[] = [];
  if (data.workshopPdfKey) keys.push(data.workshopPdfKey);
  if (data.formalPdfKey) {
    const inferred = inferWorkshopPdfKeyFromFormalPdfKey(data.formalPdfKey);
    if (!keys.includes(inferred)) keys.push(inferred);
  }
  return keys;
}

/** Hay acciones Ver/Descargar taller si podemos intentar al menos una clave en IndexedDB. */
export function hasWorkshopPdfActions(data: {
  formalPdfKey?: string;
  workshopPdfKey?: string;
}): boolean {
  return resolveWorkshopPdfKeysToTry(data).length > 0;
}

/** PDF de levantamiento detallado guardado para la vista de seguimiento (prospecto). */
export function createPreliminarSeguimientoPdfKey(taskId: string, index: number): string {
  return `preliminar-seg-${taskId}-${index}-${Date.now()}`;
}
