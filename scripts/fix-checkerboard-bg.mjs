/**
 * Quita el “fondo tablero” que a veces queda grabado en los píxeles al exportar desde Excel.
 * Solo toca los archivos listados (no todo el catálogo).
 *
 * node scripts/fix-checkerboard-bg.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "public", "images", "electrodomesticos");

/** Archivos que mostraban cuadros grises en la UI. */
const TARGETS = ["estufa-de-piso-diseno.jpg"];

/**
 * Sustituir píxeles que parecen tablero (casi gris / blanco, poca saturación),
 * sin tocar negros/sombras del producto (luminosidad baja).
 */
function isFakeCheckerBg(r, g, b) {
  const avg = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (spread > 38) return false;
  if (avg < 82) return false;
  if (avg >= 248) return true;
  if (avg >= 100 && avg <= 245) return true;
  return false;
}

async function fixOne(name) {
  const full = path.join(dir, name);
  if (!fs.existsSync(full)) {
    console.warn("Omitido (no existe):", name);
    return;
  }

  const { data, info } = await sharp(full).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const buf = Buffer.from(data);

  for (let i = 0; i < buf.length; i += channels) {
    const r = buf[i];
    const g = buf[i + 1];
    const b = buf[i + 2];
    if (isFakeCheckerBg(r, g, b)) {
      buf[i] = 255;
      buf[i + 1] = 255;
      buf[i + 2] = 255;
      buf[i + 3] = 255;
    }
  }

  const ext = path.extname(name).toLowerCase();
  const tmp = `${full}.fix-tmp`;
  let pipeline = sharp(buf, { raw: { width, height, channels: 4 } });
  if (ext === ".png") {
    await pipeline.png({ compressionLevel: 9 }).toFile(tmp);
  } else {
    await pipeline.jpeg({ quality: 92, mozjpeg: true }).toFile(tmp);
  }
  fs.renameSync(tmp, full);
  console.log("OK", name);
}

for (const f of TARGETS) {
  await fixOne(f);
}
console.log("Listo.");
