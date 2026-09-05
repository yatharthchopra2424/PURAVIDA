import sharp from "sharp";
import fs from "fs";
import path from "path";

const BRAND_GREEN = { r: 0x6a, g: 0xa4, b: 0x0e, alpha: 1 };
const OUT_ICONS = path.join("public", "icons");

async function main() {
  fs.mkdirSync(OUT_ICONS, { recursive: true });

  const greenMeta = await sharp("public/images/logo-new.png").metadata();
  const whiteMeta = await sharp("public/images/logo-bg-rm.png").metadata();
  console.log("logo-new:", greenMeta.width, greenMeta.height);
  console.log("logo-bg-rm:", whiteMeta.width, whiteMeta.height);

  // Crop just the leaf glyph (above the wordmark) from both variants, then
  // trim to a tight bounding box. Both files share the same layout
  // proportions (leaf occupies the top ~63%) but different canvas sizes.
  // sharp's .trim() chained directly after .extract() hits a libvips
  // "bad extract area" bug on this image — materializing the crop to a
  // PNG buffer first (forcing the pipeline to resolve) avoids it.
  const greenCropped = await sharp("public/images/logo-new.png")
    .extract({ left: 0, top: 0, width: greenMeta.width, height: Math.round(greenMeta.height * 0.63) })
    .png()
    .toBuffer();
  const greenLeafTrimmed = await sharp(greenCropped).trim({ threshold: 10 }).toBuffer();

  // logo-bg-rm.png lays the leaf and wordmark out side-by-side (not
  // stacked like logo-new.png). A column-content scan found the leaf glyph
  // occupies x=[19,213]; the next content run starts at x=230 (a wordmark
  // serif), so 222px cleanly excludes it without a percentage guess.
  const whiteCropped = await sharp("public/images/logo-bg-rm.png")
    .extract({ left: 0, top: 0, width: 222, height: whiteMeta.height })
    .png()
    .toBuffer();
  const whiteLeafTrimmed = await sharp(whiteCropped).trim({ threshold: 10 }).toBuffer();

  const gMeta = await sharp(greenLeafTrimmed).metadata();
  const wMeta = await sharp(whiteLeafTrimmed).metadata();
  console.log("green leaf trimmed:", gMeta.width, gMeta.height);
  console.log("white leaf trimmed:", wMeta.width, wMeta.height);

  // Helper: composite a leaf buffer, scaled to `coverage` of a square
  // canvas of `size`px, centered, onto an optional background.
  async function squareIcon({ leafBuf, leafMeta, size, coverage, background }) {
    const targetW = Math.round(size * coverage);
    const scale = targetW / leafMeta.width;
    const targetH = Math.round(leafMeta.height * scale);

    const resizedLeaf = await sharp(leafBuf)
      .resize(targetW, targetH, { fit: "fill" })
      .toBuffer();

    const left = Math.round((size - targetW) / 2);
    const top = Math.round((size - targetH) / 2);

    let canvas = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });

    return canvas
      .composite([{ input: resizedLeaf, left, top }])
      .png()
      .toBuffer();
  }

  // 1. src/app/icon.png — transparent, green leaf. Next.js auto-generates
  //    the favicon <link> tags (multiple sizes) from this single source.
  const icon512 = await squareIcon({
    leafBuf: greenLeafTrimmed,
    leafMeta: gMeta,
    size: 512,
    coverage: 0.82,
  });
  fs.writeFileSync("src/app/icon.png", icon512);

  // 2. src/app/apple-icon.png — iOS renders transparency as black, so this
  //    needs an opaque background. White keeps it consistent with the
  //    logo's natural presentation; iOS applies its own corner rounding.
  const appleIcon = await squareIcon({
    leafBuf: greenLeafTrimmed,
    leafMeta: gMeta,
    size: 180,
    coverage: 0.7,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  });
  fs.writeFileSync("src/app/apple-icon.png", appleIcon);

  // 3. Maskable icons for the PWA manifest — Android crops to a circle/
  //    squircle, so content must sit inside a ~66% "safe zone" on a solid
  //    background, using the white leaf so it reads on the brand-green fill.
  const maskable512 = await squareIcon({
    leafBuf: whiteLeafTrimmed,
    leafMeta: wMeta,
    size: 512,
    coverage: 0.6,
    background: BRAND_GREEN,
  });
  fs.writeFileSync(path.join(OUT_ICONS, "maskable-512.png"), maskable512);

  const maskable192 = await squareIcon({
    leafBuf: whiteLeafTrimmed,
    leafMeta: wMeta,
    size: 192,
    coverage: 0.6,
    background: BRAND_GREEN,
  });
  fs.writeFileSync(path.join(OUT_ICONS, "maskable-192.png"), maskable192);

  // 4. Standard "any" purpose PWA icons — transparent, green leaf, for
  //    launchers that don't mask.
  const any512 = await squareIcon({
    leafBuf: greenLeafTrimmed,
    leafMeta: gMeta,
    size: 512,
    coverage: 0.82,
  });
  fs.writeFileSync(path.join(OUT_ICONS, "icon-512.png"), any512);

  const any192 = await squareIcon({
    leafBuf: greenLeafTrimmed,
    leafMeta: gMeta,
    size: 192,
    coverage: 0.82,
  });
  fs.writeFileSync(path.join(OUT_ICONS, "icon-192.png"), any192);

  // 5. A 48px flat PNG that ffmpeg will mux into favicon.ico separately.
  const fav48 = await squareIcon({
    leafBuf: greenLeafTrimmed,
    leafMeta: gMeta,
    size: 48,
    coverage: 0.9,
  });
  fs.writeFileSync("scratch-favicon-48.png", fav48);

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
