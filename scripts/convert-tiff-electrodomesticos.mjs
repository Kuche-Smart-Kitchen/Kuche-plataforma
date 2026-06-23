/**
 * Archivos .jpg que en realidad son TIFF no se ven en el navegador. Convierte a JPEG con jimp.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Jimp from "jimp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "public", "images", "electrodomesticos");

function isTiffMagic(buf) {
  if (buf.length < 4) return false;
  const b0 = buf[0];
  const b1 = buf[1];
  return (b0 === 0x49 && b1 === 0x49) || (b0 === 0x4d && b1 === 0x4d);
}

const files = fs.readdirSync(dir);
let n = 0;
for (const f of files) {
  const ext = path.extname(f).toLowerCase();
  if (![".jpg", ".jpeg"].includes(ext)) continue;
  const full = path.join(dir, f);
  const buf = fs.readFileSync(full);
  if (!isTiffMagic(buf)) continue;
  const tmp = full + ".__conv__.jpg";
  try {
    const image = await Jimp.read(full);
    await image.quality(92).writeAsync(tmp);
    fs.renameSync(tmp, full);
    console.log("OK", f);
    n++;
  } catch (e) {
    console.error("FAIL", f, e.message);
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}
console.log("Total convertidos:", n);
