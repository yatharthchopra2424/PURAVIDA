/**
 * Bulk-sources representative images for catalog products that have no
 * image_path, from Wikimedia Commons (public API, no auth/account
 * needed — every file on Commons is required to carry a free license).
 *
 * Strategy: search by botanical name first (best signal for a real
 * ingredient), fall back to the product name for synthetic compounds.
 * Downloads go to a staging folder for review before anything touches
 * Supabase — a wrong plant photo on a B2B ingredient page is worse than
 * a generic placeholder.
 */
import fs from "fs";
import path from "path";

const STAGING = "scratch-product-images";
const UA =
  "PuraVidaNaturalSite/1.0 (https://www.puravidanaturalindia.com; contact: rk@puravida.org.in) node-fetch";

const BAD_TITLE_HINTS = [
  "distribution",
  "map",
  "icon",
  "logo",
  "location",
  "range.",
  "diagram",
  "structural formula",
  "chemical structure",
  "skeletal",
  ".svg",
  "flag",
  "coat of arms",
  "structure",
  "formula",
  "reaction",
  "pathway",
  "mechanism",
  "biosynthesis",
  "catalytic",
  "promiscuity",
  "scheme",
  "synthesis of",
  "synthesis route",
  "cycle.",
  "molecule",
  "molecular",
  "enzymatic",
  "herbarium",
  "type specimen",
  "specimen sheet",
  "stamp",
  "postage",
  "coin",
  "banknote",
  // Someone else's finished, branded retail product — a real risk on
  // supplement/compound searches (a labeled pill bottle photo showed up
  // for "alpha lipoic acid" carrying a competing Russian pharma brand).
  "tablet",
  "tablets",
  "capsule",
  "capsules",
  "pack of",
  "box of",
  "bottle of",
  "issued",
  "prescription",
  "pharmacy",
  "supplement facts",
  "label",
  "packaging",
  "blister",
  // 3D molecular renders read as off-brand (black background, clashes
  // with the rest of the catalog's plant photography) and one showed up
  // for the wrong compound entirely (Resveratrol-3D.png was generic).
  "3d",
  "jmol",
  "ball-and-stick",
  "ball & stick",
  // Pollinator close-ups keep outranking the plant itself for flower
  // sources (a bee filled the frame for a Tagetes/zeaxanthin search).
  " bee ",
  " bee.",
  "biene",
  "abeille",
  "hoverfly",
  "butterfly",
  "papillon",
  "dragonfly",
  // Latin genus names for common pollinators — Commons flower photos are
  // very often actually insect macro shots (a Painted Lady butterfly,
  // "Vanessa cardui", filled the frame on a lavender search).
  "vanessa ",
  "bombus ",
  "apis ",
  "papilio ",
  "pieris ",
  "danaus ",
  "colias ",
  "vespula ",
  "syrphidae",
  "syrphid",
];

/**
 * Non-botanical "source" labels used in place of a real genus/species —
 * e.g. "Fermentation", "Porcine Source". Searching these literally
 * returns unrelated Commons photos (a pig farm for "Pancreatin", a
 * water-source photo for an L-Malic Acid tagged "Natural Source") far
 * too often to trust unattended, same risk class as "Synthetic".
 */
const SKIP_SOURCE_LABELS = new Set(
  [
    "synthetic",
    "fermentation",
    "fermentation / synthetic",
    "bovine milk",
    "bovine source",
    "marine source",
    "algal source",
    "fish source",
    "fish / algal source",
    "porcine source",
    "dairy source",
    "natural source",
    "plant oils",
    "beta-alanine + l-histidine",
  ].map((s) => s.toLowerCase())
);

/** Meaningful words (4+ chars) from a search term, for relevance checks. */
function keyWords(term) {
  return term
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 4);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function commonsSearch(term, limit = 8) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srsearch=${encodeURIComponent(
    term
  )}&format=json&srlimit=${limit}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`search HTTP ${res.status}`);
  const data = await res.json();
  return data.query?.search ?? [];
}

async function imageInfo(titles) {
  if (titles.length === 0) return {};
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    titles.join("|")
  )}&prop=imageinfo&iiprop=url|size|mime|extmetadata&format=json`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`imageinfo HTTP ${res.status}`);
  const data = await res.json();
  const pages = data.query?.pages ?? {};
  const byTitle = {};
  for (const key of Object.keys(pages)) {
    const page = pages[key];
    const info = page.imageinfo?.[0];
    if (info) byTitle[page.title] = info;
  }
  return byTitle;
}

function isLikelyPhoto(title, info, term) {
  const lower = title.toLowerCase();
  if (BAD_TITLE_HINTS.some((hint) => lower.includes(hint))) return false;
  if (!info.mime || !info.mime.startsWith("image/")) return false;
  if (info.mime === "image/svg+xml") return false;
  if ((info.width ?? 0) < 500) return false;
  // Topical relevance: the title must actually mention what we searched
  // for, not just be "a photo that happened to rank" — this is what let
  // an unrelated enzyme diagram through despite the diagram-word filter.
  const words = keyWords(term);
  if (words.length > 0 && !words.some((w) => lower.includes(w))) return false;
  return true;
}

/** Strip trailing descriptors so "Ashwagandha Root Extract" -> "Ashwagandha". */
function simplifyName(name) {
  return name
    .replace(
      /\b(extract|oil|powder|oleoresin|resin|hcl|hydrochloride|acetate|sulfate|citrate|malate|monohydrate|anhydrous|complex|blend|standardized|natural|organic|root|leaf|seed|fruit|bark|flower|essential)\b/gi,
      ""
    )
    .replace(/\d+(\.\d+)?%[-–]?\d*(\.\d+)?%?/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function findImageFor(product) {
  const attempts = [];
  const botanical = (product.botanical_name || "").trim();
  if (botanical && botanical.toLowerCase() !== "synthetic") {
    // First two words are almost always genus + species.
    attempts.push(botanical.split(" ").slice(0, 2).join(" "));
  }
  const simplified = simplifyName(product.name);
  if (simplified) attempts.push(simplified);
  attempts.push(product.name);

  for (const term of attempts) {
    if (!term) continue;
    try {
      const results = await commonsSearch(term, 8);
      if (results.length === 0) continue;
      const titles = results.map((r) => r.title);
      const infos = await imageInfo(titles);
      for (const title of titles) {
        const info = infos[title];
        if (info && isLikelyPhoto(title, info, term)) {
          return { term, title, info };
        }
      }
    } catch (err) {
      console.error(`  [warn] search failed for "${term}":`, err.message);
    }
    await sleep(150);
  }
  return null;
}

async function main() {
  const missing = JSON.parse(fs.readFileSync("scratch-missing-images.json", "utf8"));
  fs.mkdirSync(STAGING, { recursive: true });

  const manifest = [];
  const startAt = Number(process.argv[2] || 0);
  const endAt = Number(process.argv[3] || missing.length);
  const slice = missing.slice(startAt, endAt);

  console.log(`Processing ${slice.length} products (${startAt}..${endAt} of ${missing.length})`);

  for (let i = 0; i < slice.length; i++) {
    const product = slice[i];
    process.stdout.write(`[${startAt + i + 1}/${missing.length}] ${product.name} ... `);

    const botanical = (product.botanical_name || "").trim().toLowerCase();
    if (!botanical || SKIP_SOURCE_LABELS.has(botanical)) {
      // Pure chemical/synthetic compounds and non-botanical source labels
      // ("Fermentation", "Porcine Source", "Natural Source"...) have no
      // real-world plant photo, and Commons search for these turns up
      // unrelated diagrams or wrong-subject photos (a pig farm for
      // "Pancreatin", a water-source photo for "Natural Source") far too
      // often to trust unattended. These need curated stock photography
      // instead — skip rather than risk a wrong image going live.
      console.log("SKIPPED (no safe photo source)");
      manifest.push({ ...product, status: "skipped_synthetic" });
      continue;
    }

    const match = await findImageFor(product);
    if (!match) {
      console.log("NO MATCH");
      manifest.push({ ...product, status: "no_match" });
      continue;
    }

    const ext = match.info.mime === "image/png" ? "png" : match.info.mime === "image/webp" ? "webp" : "jpg";
    const destName = `${product.slug}.${ext}`;
    try {
      const imgRes = await fetch(match.info.url, { headers: { "User-Agent": UA } });
      if (!imgRes.ok) throw new Error(`download HTTP ${imgRes.status}`);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      fs.writeFileSync(path.join(STAGING, destName), buf);

      const meta = match.info.extmetadata || {};
      manifest.push({
        ...product,
        status: "matched",
        searchTerm: match.term,
        commonsTitle: match.title,
        sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(match.title)}`,
        directUrl: match.info.url,
        license: meta.LicenseShortName?.value || "unknown",
        artist: (meta.Artist?.value || "").replace(/<[^>]+>/g, "").trim(),
        stagedFile: destName,
      });
      console.log(`OK  (${match.title})`);
    } catch (err) {
      console.log("DOWNLOAD FAILED: " + err.message);
      manifest.push({ ...product, status: "download_failed", error: err.message });
    }
    await sleep(200);
  }

  const manifestPath = `scratch-image-manifest-${startAt}-${endAt}.json`;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const matched = manifest.filter((m) => m.status === "matched").length;
  console.log(`\nDone. Matched ${matched}/${manifest.length}. Manifest: ${manifestPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
