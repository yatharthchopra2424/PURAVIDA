import fs from "fs";
import sharp from "sharp";

const BUCKET = "product-images";
const MAX_WIDTH = 1920;

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

const SELECTIONS = {
  "essential-oils": {
    file: "scratch-category-images/essential-oils.jpg",
    commonsTitle: "File:Lavandula fields.jpg",
    artist: "Neptuul",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Lavandula_fields.jpg",
  },
  "herbal-extracts": {
    file: "scratch-category-images/herbal-extracts.jpg",
    commonsTitle: "File:Curcuma longa roots.jpg",
    artist: "Simon A. Eugster",
    license: "CC BY-SA 3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Curcuma_longa_roots.jpg",
  },
  oleoresins: {
    file: "scratch-category-images/oleoresins.jpg",
    commonsTitle: "File:Black Pepper (Piper nigrum) fruits.jpg",
    artist: "K Hari Krishnan",
    license: "CC BY-SA 3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Black_Pepper_(Piper_nigrum)_fruits.jpg",
  },
  nutraceuticals: {
    file: "scratch-category-images/nutraceuticals.jpg",
    commonsTitle: "File:Spirulina-powder-shadow.jpg",
    artist: "",
    license: "CC BY-SA 3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Spirulina-powder-shadow.jpg",
  },
};

async function uploadToStorage(supabaseUrl, serviceKey, storageKey, buffer) {
  const url = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodeURIComponent(storageKey)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "x-upsert": "true",
      "Content-Type": "image/jpeg",
    },
    body: buffer,
  });
  if (!res.ok) throw new Error(`upload ${storageKey}: ${res.status} ${await res.text()}`);
}

async function patchCategory(supabaseUrl, serviceKey, id, imagePath) {
  const url = `${supabaseUrl}/rest/v1/product_categories?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ image: imagePath }),
  });
  if (!res.ok) throw new Error(`patch ${id}: ${res.status} ${await res.text()}`);
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  const attribution = JSON.parse(
    fs.existsSync("public/product_images/COMMONS-ATTRIBUTION.json")
      ? fs.readFileSync("public/product_images/COMMONS-ATTRIBUTION.json", "utf8")
      : "{}"
  );

  for (const [categoryId, sel] of Object.entries(SELECTIONS)) {
    const buffer = await sharp(sel.file)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    const storageKey = `category-${categoryId}.jpg`;
    await uploadToStorage(supabaseUrl, serviceKey, storageKey, buffer);
    await patchCategory(supabaseUrl, serviceKey, categoryId, storageKey);

    attribution[`category:${categoryId}`] = {
      productName: `${categoryId} (category hero)`,
      commonsTitle: sel.commonsTitle,
      sourceUrl: sel.sourceUrl,
      license: sel.license,
      artist: sel.artist,
    };

    console.log(`${categoryId}: OK -> ${storageKey}`);
  }

  fs.writeFileSync(
    "public/product_images/COMMONS-ATTRIBUTION.json",
    JSON.stringify(attribution, null, 2)
  );
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
