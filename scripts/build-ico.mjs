/**
 * ffmpeg's .ico muxer produced a file Next.js/sharp's decoder rejected
 * ("ICO image data size did not match expected size"). Modern ICO files
 * can just embed a raw PNG per entry (no BMP re-encoding needed) — this
 * hand-rolls that minimal, well-documented container directly.
 */
import fs from "fs";
import sharp from "sharp";

async function buildIco(pngBuffers, outPath) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(count, 4);

  const entries = [];
  for (const png of pngBuffers) {
    const meta = await sharp(png).metadata();
    const w = meta.width >= 256 ? 0 : meta.width;
    const h = meta.height >= 256 ? 0 : meta.height;
    const entry = Buffer.alloc(16);
    entry.writeUInt8(w, 0);
    entry.writeUInt8(h, 1);
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }

  fs.writeFileSync(outPath, Buffer.concat([header, ...entries, ...pngBuffers]));
}

async function main() {
  const sizes = [16, 32, 48];
  const buffers = [];
  for (const size of sizes) {
    const buf = await sharp("src/app/icon.png")
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    buffers.push(buf);
  }
  await buildIco(buffers, "src/app/favicon.ico");
  console.log("favicon.ico written:", fs.statSync("src/app/favicon.ico").size, "bytes");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
