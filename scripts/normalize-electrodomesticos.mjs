/**
 * Normaliza TODAS las imágenes de electrodomésticos para que el navegador
 * pueda renderizarlas de forma consistente.
 *
 * - Lee cualquier formato que sharp soporte (aunque tenga extensión rara).
 * - Reescribe en el mismo nombre:
 *   - .jpg/.jpeg => JPEG
 *   - .png => PNG
 *   - .webp => WEBP
 *   - otros => JPEG
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "public", "images", "electrodomesticos");

const allowed = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".tif", ".tiff", ".bmp"]);

function outputFormat(ext) {
  const e = ext.toLowerCase();
  if (e === ".png") return "png";
  if (e === ".webp") return "webp";
  return "jpeg";
}

async function normalizeOne(fullPath) {
  const ext = path.extname(fullPath).toLowerCase();
  if (!allowed.has(ext)) return { skipped: true };

  const tmp = `${fullPath}.__normalized__`;
  const format = outputFormat(ext);

  let pipeline = sharp(fullPath, { failOn: "none" }).rotate();
  if (format === "png") pipeline = pipeline.png({ compressionLevel: 9 });
  else if (format === "webp") pipeline = pipeline.webp({ quality: 88 });
  else pipeline = pipeline.jpeg({ quality: 88, mozjpeg: true });

  await pipeline.toFile(tmp);
  fs.renameSync(tmp, fullPath);
  return { skipped: false, format };
}

async function main() {
  if (!fs.existsSync(dir)) {
    console.error("No existe directorio:", dir);
    process.exit(1);
  }

  const files = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile());
  let converted = 0;
  let skipped = 0;
  let failed = 0;

  for (const f of files) {
    const full = path.join(dir, f);
    try {
      const out = await normalizeOne(full);
      if (out.skipped) {
        skipped++;
        continue;
      }
      converted++;
      console.log(`OK   ${f}`);
    } catch (err) {
      failed++;
      console.error(`FAIL ${f} -> ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log("------");
  console.log(`Convertidas: ${converted}`);
  console.log(`Omitidas:    ${skipped}`);
  console.log(`Fallidas:    ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
