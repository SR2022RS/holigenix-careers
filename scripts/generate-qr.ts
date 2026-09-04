/**
 * Generates the printed "Scan Me" QR code.
 *
 *   npm run qr
 *
 * Encodes QR_TARGET_URL (`${SITE_URL}/?src=qr-choa`) from src/lib/config.ts —
 * the same constant the app uses for its canonical URL — so the QR and the
 * site it points to can never drift apart. Writes:
 *
 *   public/qr/scan-me.svg  — vector print master
 *   public/qr/scan-me.png  — 1200×1200 preview / quick share
 *
 * Error correction level H so the code still scans when smudged or torn.
 * Navy foreground on white for brand match and maximum scan contrast.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { QR_TARGET_URL, SITE_URL } from "../src/lib/config";

const NAVY = "#0f2b3dff";
const WHITE = "#ffffffff";
const OUT_DIR = path.join(process.cwd(), "public", "qr");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const common = {
    errorCorrectionLevel: "H" as const,
    margin: 2,
    color: { dark: NAVY, light: WHITE },
  };

  const svg = await QRCode.toString(QR_TARGET_URL, { ...common, type: "svg" });
  await writeFile(path.join(OUT_DIR, "scan-me.svg"), svg, "utf8");

  const png = await QRCode.toBuffer(QR_TARGET_URL, {
    ...common,
    type: "png",
    width: 1200,
  });
  await writeFile(path.join(OUT_DIR, "scan-me.png"), png);

  console.log("QR code generated");
  console.log(`  SITE_URL : ${SITE_URL}`);
  console.log(`  encodes  : ${QR_TARGET_URL}`);
  console.log(`  svg      : ${path.relative(process.cwd(), path.join(OUT_DIR, "scan-me.svg"))}`);
  console.log(`  png      : ${path.relative(process.cwd(), path.join(OUT_DIR, "scan-me.png"))} (1200×1200)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
