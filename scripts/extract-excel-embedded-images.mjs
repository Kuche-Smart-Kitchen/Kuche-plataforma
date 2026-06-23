/**
 * Extrae imágenes incrustadas de un .xlsx y las guarda nombradas según el texto
 * de una columna en la misma fila que el ancla de la imagen.
 *
 * No requiere Python. Usa ExcelJS (npm).
 *
 * Uso (desde la raíz del proyecto):
 *   npm run extract:excel-images
 *   npm run extract:excel-images -- ELECTRODOMESTICOS.xlsx -o imagenes_extraidas -c 1
 *
 * Opciones:
 *   -o <carpeta>   Salida (default: imagenes_extraidas)
 *   -c <n>         Columna 1-based del nombre (1=A, default: 1)
 *   -s <nombre>    Nombre de la hoja (default: primera hoja)
 */

import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function sanitizeStem(text) {
  if (text == null || String(text).trim() === "") return "sin_nombre";
  let t = String(text)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/[^a-z0-9_.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (!t) return "sin_nombre";
  return t.slice(0, 180);
}

function parseArgs(argv) {
  const out = {
    excel: "ELECTRODOMESTICOS.xlsx",
    outDir: "imagenes_extraidas",
    nameCol: 1,
    sheet: null,
  };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-o" && argv[i + 1]) {
      out.outDir = argv[++i];
    } else if (a === "-c" && argv[i + 1]) {
      out.nameCol = Math.max(1, parseInt(argv[++i], 10) || 1);
    } else if (a === "-s" && argv[i + 1]) {
      out.sheet = argv[++i];
    } else if (!a.startsWith("-")) {
      rest.push(a);
    }
  }
  if (rest[0]) out.excel = rest[0];
  return out;
}

function anchorToExcelRow(tl) {
  if (!tl) return null;
  // ExcelJS: nativeRow suele ser 0-based; row puede ser fraccionario 0-based
  if (typeof tl.nativeRow === "number") return tl.nativeRow + 1;
  if (typeof tl.row === "number") return Math.floor(tl.row) + 1;
  return null;
}

function uniquePath(folder, stem, ext) {
  let base = path.join(folder, `${stem}${ext}`);
  if (!fs.existsSync(base)) return base;
  let n = 2;
  for (;;) {
    const cand = path.join(folder, `${stem}_${n}${ext}`);
    if (!fs.existsSync(cand)) return cand;
    n++;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const excelPath = path.resolve(process.cwd(), args.excel);
  const outDir = path.resolve(process.cwd(), args.outDir);

  if (!fs.existsSync(excelPath)) {
    console.error(`No existe el archivo: ${excelPath}`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  const worksheet = args.sheet
    ? workbook.getWorksheet(args.sheet)
    : workbook.worksheets[0];

  if (!worksheet) {
    console.error(`No se encontró la hoja: ${args.sheet || "(primera)"}`);
    process.exit(1);
  }

  const images = worksheet.getImages?.() ?? [];
  if (!images.length) {
    console.error(
      "No hay imágenes incrustadas en esta hoja (getImages vacío).\n" +
        "Comprueba la hoja (-s) y que las fotos estén insertadas en el Excel, no solo enlaces rotos.",
    );
    process.exit(2);
  }

  let saved = 0;
  let errors = 0;

  function resolveImageBuffer(imageId) {
    const fromMethod = workbook.getImage?.(imageId);
    if (fromMethod?.buffer) return fromMethod;
    const media = workbook.model?.media;
    if (Array.isArray(media)) {
      const m = media.find((x) => x.index === imageId);
      if (m?.buffer) return m;
    }
    return null;
  }

  for (let idx = 0; idx < images.length; idx++) {
    const entry = images[idx];
    try {
      const imageId = entry.imageId;
      const meta = resolveImageBuffer(imageId);
      if (!meta || !meta.buffer) {
        console.error(`[${idx + 1}] Sin buffer para imageId=${imageId}`);
        errors++;
        continue;
      }

      const extRaw = meta.extension ? String(meta.extension).replace(/^\./, "") : "bin";
      const extWithDot = `.${extRaw}`;
      const row = anchorToExcelRow(entry.range?.tl);
      if (row == null) {
        console.error(`[${idx + 1}] No se pudo leer la fila del ancla`);
        errors++;
        continue;
      }

      const cell = worksheet.getRow(row).getCell(args.nameCol);
      const raw = cell.value;
      let text = raw;
      if (raw && typeof raw === "object" && "richText" in raw) {
        text = raw.richText?.map((r) => r.text).join("") ?? "";
      }
      if (raw && typeof raw === "object" && "text" in raw) {
        text = raw.text;
      }

      const stem = sanitizeStem(text);
      const dest = uniquePath(outDir, stem, extWithDot);
      fs.writeFileSync(dest, meta.buffer);
      console.log(`OK  fila ${row}  ->  ${path.basename(dest)}`);
      saved++;
    } catch (e) {
      console.error(`[${idx + 1}] Error:`, e.message || e);
      errors++;
    }
  }

  console.log(`\nListo: ${saved} imagen(es) en ${outDir}`);
  if (errors) console.error(`Avisos/errores: ${errors}`);
  process.exit(saved ? 0 : 3);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
