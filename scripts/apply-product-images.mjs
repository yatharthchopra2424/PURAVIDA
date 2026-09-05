/**
 * Takes the reviewed image manifest (scratch-image-manifest-0-217.json),
 * resizes/re-encodes each staged photo, uploads it to the same Supabase
 * Storage bucket the admin panel already uses ("product-images"), and
 * PATCHes each product's image_path — mirroring scripts/upload-product-images.ts's
 * auth pattern (same .env, same bucket, same REST endpoints).
 *
 * Also writes public/product_images/COMMONS-ATTRIBUTION.json, a durable
 * record of {title, author, license, sourceUrl} per image — several of
 * these are CC-BY / CC-BY-SA, which require attribution. See
 * src/app/(public)/image-credits/page.tsx, which renders this file.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const STAGING = "scratch-product-images";
const BUCKET = "product-images";
const MAX_WIDTH = 1600;

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i)] = t.slice(i + 1);
  }
  return env;
}

async function uploadToStorage(supabaseUrl, serviceKey, storageKey, buffer, contentType) {
  const url = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodeURIComponent(storageKey)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "x-upsert": "true",
      "Content-Type": contentType,
    },
    body: buffer,
  });
  if (!res.ok) {
    throw new Error(`upload ${storageKey}: ${res.status} ${await res.text()}`);
  }
}

async function patchProduct(supabaseUrl, serviceKey, id, imagePath) {
  const url = `${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ image_path: imagePath }),
  });
  if (!res.ok) {
    throw new Error(`patch ${id}: ${res.status} ${await res.text()}`);
  }
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase env vars");

  const manifestPath = process.argv[2] || "scratch-image-manifest-0-217.json";
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const matched = manifest.filter((m) => m.status === "matched");

  console.log(`Applying ${matched.length} images...`);

  const attribution = {};
  let ok = 0;
  let failed = 0;

  for (let i = 0; i < matched.length; i++) {
    const item = matched[i];
    const srcPath = path.join(STAGING, item.stagedFile);
    if (!fs.existsSync(srcPath)) {
      console.log(`[${i + 1}/${matched.length}] ${item.slug}: staged file missing, skip`);
      continue;
    }

    try {
      const meta = await sharp(srcPath).metadata();
      const needsResize = (meta.width || 0) > MAX_WIDTH;
      const pipeline = sharp(srcPath).rotate();
      if (needsResize) pipeline.resize({ width: MAX_WIDTH });

      const isPng = item.stagedFile.toLowerCase().endsWith(".png");
      const buffer = isPng
        ? await pipeline.png({ quality: 85 }).toBuffer()
        : await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();

      const ext = isPng ? "png" : "jpg";
      const storageKey = `${item.slug}.${ext}`;
      const contentType = isPng ? "image/png" : "image/jpeg";

      await uploadToStorage(supabaseUrl, serviceKey, storageKey, buffer, contentType);
      await patchProduct(supabaseUrl, serviceKey, item.id, storageKey);

      attribution[item.slug] = {
        productName: item.name,
        commonsTitle: item.commonsTitle,
        sourceUrl: item.sourceUrl,
        license: item.license,
        artist: item.artist,
      };

      ok += 1;
      console.log(`[${i + 1}/${matched.length}] ${item.slug}: OK`);
    } catch (err) {
      failed += 1;
      console.error(`[${i + 1}/${matched.length}] ${item.slug}: FAILED — ${err.message}`);
    }
  }

  fs.mkdirSync("public/product_images", { recursive: true });
  fs.writeFileSync(
    "public/product_images/COMMONS-ATTRIBUTION.json",
    JSON.stringify(attribution, null, 2)
  );

  console.log(`\nDone. ${ok} uploaded + patched, ${failed} failed.`);
  console.log("Attribution records: public/product_images/COMMONS-ATTRIBUTION.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
