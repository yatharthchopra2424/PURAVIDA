/**
 * image-agent.ts: finds free, commercially usable photos for every catalogue
 * product that has none, downloads them, and (with --push) uploads them to
 * Supabase Storage and points the product at them.
 *
 *   npm run images:find                      # search + download + review sheet, NO database writes
 *   npm run images:push                      # same, then upload and update products
 *   npm run images:push -- --only rhodiola-rosea-extract,arbutin
 *   npm run images:find -- --min 45          # accept weaker matches (default 55)
 *   npm run images:find -- --recheck         # also treat products whose image URL is broken as missing
 *   npm run images:find -- --no-parent       # skip the parent-product fallback
 *   npm run images:push -- --reuse           # upload the last run's results without searching again
 *
 * How it decides (per product, in order):
 *   1. Search by botanical name, then plain name, in "powder" and plant/raw
 *      form, across Wikimedia Commons, Openverse, and Pexels/Pixabay if you
 *      set PEXELS_API_KEY / PIXABAY_API_KEY. Only licences that allow
 *      commercial use are ever considered (see sources.ts).
 *   2. Every candidate is scored: it must actually mention the plant or
 *      ingredient, must not look like a diagram/label/insect/herbarium
 *      sheet, and must be large enough. The best one at or above --min wins.
 *   3. Nothing found? Use the PARENT product's image: a sibling with the
 *      same botanical species/genus or base name (e.g. "Ginger Oleoresin"
 *      uses the Ginger Extract photo). These are flagged "representative".
 *   4. Still nothing: left blank and listed in the report for a human.
 *
 * Every image used is recorded (author, licence, source page) in
 * public/product_images/COMMONS-ATTRIBUTION.json, which the site's
 * /image-credits page renders, as CC BY / CC BY-SA require attribution.
 *
 * Output goes to scratch-product-images/agent/ : the downloaded .webp
 * files, manifest.json and report.html (open it in a browser to review
 * every choice with thumbnails before or after pushing).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import sharp from "sharp";
import { loadEnv, parseArgs, serviceClient } from "../leads/_env";
import { searchAll, sleep, type Candidate } from "./sources";

const OUT = path.resolve(process.cwd(), "scratch-product-images", "agent");
const ATTRIBUTION = path.resolve(process.cwd(), "public", "product_images", "COMMONS-ATTRIBUTION.json");
const BUCKET = "product-images";

interface Product {
  id: string;
  name: string;
  slug: string;
  botanical_name: string | null;
  category_id: string;
  image_path: string | null;
  active_ingredient: string | null;
}

interface Choice {
  slug: string;
  name: string;
  method: "direct" | "parent" | "none";
  query?: string;
  score?: number;
  candidate?: Candidate;
  parent?: string;
  file?: string;
  note?: string;
}

// ── Name handling ─────────────────────────────────────────────────
const STRIP = /\b(extract|oil|powder|oleoresin|resin|hcl|hydrochloride|acetate|sulfate|sulphate|citrate|malate|monohydrate|anhydrous|complex|blend|standardi[sz]ed|natural|organic|essential|juice|concentrate|isolate|peptides?|fibre|fiber)\b/gi;
const simplify = (name: string) =>
  name.replace(STRIP, " ").replace(/\d+(\.\d+)?\s*%?\s*[-–]?\s*\d*(\.\d+)?\s*%?/g, " ").replace(/\([^)]*\)/g, " ").replace(/[^a-zA-Z\s'-]/g, " ").replace(/\s+/g, " ").trim();

const botanicalOf = (p: Product): string | null => {
  const b = (p.botanical_name ?? "").split(/[\/,;]| and /i)[0].trim();
  if (!b || /synthetic|fermentation|marine|bovine|source/i.test(b)) return null;
  return b.split(/\s+/).slice(0, 2).join(" ");
};

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !/^(and|the|for|with)$/.test(w));

/**
 * Other names a buyer or a photographer might use for the same substance.
 * A candidate matches if ALL words of ANY of these names appear in its title.
 */
const ALIASES: Record<string, string[]> = {
  "coenzyme q10": ["coq10", "coenzyme q10", "ubiquinone"],
  "coq10": ["coq10", "coenzyme q10", "ubiquinone"],
  "ubiquinol": ["ubiquinol", "coenzyme q10"],
  "methyl sulfonyl methane": ["msm", "methylsulfonylmethane", "dimethyl sulfone"],
  "sodium hyaluronate": ["hyaluronic acid", "hyaluronate"],
  "omega-3 fish oil": ["fish oil"],
  "phytosterols": ["phytosterol", "plant sterol"],
  "collagen peptide": ["collagen peptide", "collagen powder", "hydrolyzed collagen", "hydrolysed collagen", "collagen"],
  "collagen peptides": ["collagen peptide", "collagen powder", "hydrolyzed collagen", "hydrolysed collagen", "collagen"],
  "marine collagen": ["marine collagen", "fish collagen", "collagen powder"],
  "alpha lipoic acid": ["lipoic acid"],
  "d-biotin": ["biotin"],
  "folic acid": ["folic acid", "folate"],
  "bcaa blend": ["bcaa", "branched chain amino"],
  "inositol": ["inositol"],
  "myo-inositol": ["myo-inositol", "inositol"],
  "d-chiro inositol": ["chiro-inositol", "chiro inositol", "d-chiro"],
  "l-glutathione reduced": ["glutathione"],
  "glutathione reduced": ["glutathione"],
};

/** All acceptable name variants for a product, as word lists. */
function nameVariants(p: Product): string[][] {
  const base = simplify(p.name).toLowerCase();
  const list = new Set<string>([base]);
  for (const [k, v] of Object.entries(ALIASES)) if (base === k || base.startsWith(k)) v.forEach((x) => list.add(x));
  return [...list].map((n) => words(n)).filter((w) => w.length > 0);
}

/** Words that change which chemical it is. If the photo says them and the product name doesn't, it is a different substance. */
const QUALIFIERS = ["acetyl", "methyl", "n-acetyl", "dl-", "carbonate", "sulfate", "chloride", "oxide", "stearate", "citrate", "gluconate"];

const BAD = /diagram|\bmap\b|distribution|structure|formula|molecul|skeletal|3d|jmol|scheme|pathway|reaction|synthesis|herbarium|specimen|type sheet|stamp|coin|banknote|label|packag|blister|tablet|capsule|pharmacy|prescription|supplement facts|logo|icon|flag|\bbee\b|butterfly|moth|hoverfly|dragonfly|beetle|larva|spider|fungus|\.svg|drawing|illustration|engraving|lithograph|painting|plate \d|book|manuscript|newspaper|poster|cartoon/i;
/** Titles that show a brand, a pet or medical product, a lab figure, a chart, food or a drink instead of the ingredient itself. */
const NOT_INGREDIENT = /\bbottle|\bbrand|nutrition |gold standard|optimus|nutriflex|nature's|energy drink|headshot|\bcola\b|coca-?cola|soup|salad|recipe|dinner|lunch|breakfast|\bcats?\b|\bdogs?\b|\bpets?\b|veterinar|injection|syringe|\bvial|ampoule|hospital|patient|\bcells?\b|mouse|mice|\brats?\b|\bgut\b|synap|phylogen|percent|placebo|strength|\bchart|graph|figure|\bplot\b|servier|medical art|in vitro|assay|inhibition|decarboxylase|receptor|\benzyme|protein structure|model kit|molek|molecul|\bdjr\b|\d+\s?(ml|mg|kg|oz)\b|\bpack\b|\bbox\b|\bshop|\bstore\b|supermarket|winschoten|pharmacy|chemist|apotheke|etos\b|tablet|capsule|softgel|gummies|\bfish\b|chill?y|chili|curry|\brice\b|bread|cake|meat|chicken|sausage|cheese|cream|yogh?urt|smoothie|shake|coffee|\btea\b|fruit|vegetable/i;
/** For plain chemicals (no botanical name) the title must also say it is a sample / powder / crystal. */
const LOOKS_LIKE_INGREDIENT = /sample|powder|crystal|granul|bulk|solid|flakes|white|supplement powder|spoon|scoop/i;

const PLANTY = /powder|dried|root|leaf|leaves|seed|fruit|flower|bark|herb|plant|spice|extract|berry|berries|bulb|rhizome|resin|husk|grain|pods?|cloves?|stem/i;

// ── Scoring ────────────────────────────────────────────────────────
function score(p: Product, c: Candidate, usedUrls: Set<string>): number {
  if (usedUrls.has(c.url)) return 0;
  const t = c.title.toLowerCase();
  if (BAD.test(t) || NOT_INGREDIENT.test(t)) return 0;
  if (c.mime === "image/gif" || (c.width && c.width < 600) || (c.height && c.height < 400)) return 0;
  const bot = botanicalOf(p);
  const simple = words(simplify(p.name));
  let s = 0;
  if (bot) {
    const [g, sp] = bot.toLowerCase().split(/\s+/);
    if (g && sp && t.includes(g) && t.includes(sp)) s += 50;
    else if (g && t.includes(g)) s += 30;
  }
  if (!bot) {
    // Plain chemical / nutraceutical: strict. All name words present, and it must look like the substance itself.
    if (!nameVariants(p).some((v) => v.every((w) => t.includes(w)))) return 0;
    if (!LOOKS_LIKE_INGREDIENT.test(t)) return 0;
    const own = p.name.toLowerCase();
    if (QUALIFIERS.some((q) => t.includes(q) && !own.includes(q))) return 0; // e.g. N-acetylglucosamine is not glucosamine sulfate
    s += 40;
  } else if (s === 0 && simple.some((w) => t.includes(w))) s += 30;
  if (s === 0) return 0; // must actually be about this ingredient
  if (simple.length && simple.every((w) => t.includes(w))) s += 10;
  if (PLANTY.test(t)) s += 10;
  if (c.width >= 1000) s += 8;
  if (c.width >= 1600) s += 4;
  const ratio = c.height ? c.width / c.height : 1.3;
  if (ratio > 2.2 || ratio < 0.45) s -= 25;
  if (/jpe?g|webp/.test(c.mime)) s += 6;
  if (c.source === "commons") s += 4;
  return Math.max(0, s);
}

function ladder(p: Product): string[] {
  const bot = botanicalOf(p);
  const simple = simplify(p.name);
  const q: string[] = [];
  const cat = p.category_id;
  if (bot) {
    if (cat !== "essential-oils") q.push(`${bot} powder`);
    q.push(bot);
    if (cat === "essential-oils") q.push(`${bot} flowers`);
  }
  if (simple) {
    q.push(`${simple} powder`);
    q.push(simple);
    if (cat === "essential-oils") q.push(`${simple} plant`);
  }
  if (!bot && !simple) q.push(p.name);
  return [...new Set(q.filter(Boolean))];
}

// ── Parent fallback ────────────────────────────────────────────────
function findParent(p: Product, haveImage: Map<string, Product>): Product | null {
  const bot = botanicalOf(p);
  const simple = simplify(p.name).toLowerCase();
  let best: { q: Product; rank: number } | null = null;
  for (const q of haveImage.values()) {
    if (q.slug === p.slug) continue;
    const qb = botanicalOf(q);
    const qs = simplify(q.name).toLowerCase();
    let rank = 0;
    if (bot && qb && bot.toLowerCase() === qb.toLowerCase()) rank = 100; // same species
    else if (bot && qb && bot.split(" ")[0].toLowerCase() === qb.split(" ")[0].toLowerCase()) rank = 70; // same genus
    else if (simple && qs && simple === qs) rank = 90; // same base name
    else if (simple.length >= 4 && qs.length >= 4 && (simple.includes(qs) || qs.includes(simple))) rank = 60;
    else {
      // Same substance under another name, e.g. "CoQ10" and "Coenzyme Q10 (Ubiquinone)".
      const mine = nameVariants(p).map((v) => v.join(" "));
      const theirs = nameVariants(q).map((v) => v.join(" "));
      if (mine.some((m) => m.length >= 3 && theirs.includes(m))) rank = 80;
    }
    if (rank && (!best || rank > best.rank || (rank === best.rank && q.category_id === p.category_id))) best = { q, rank };
  }
  return best?.q ?? null;
}

// ── Image processing ───────────────────────────────────────────────
async function download(c: Candidate): Promise<Buffer | null> {
  try {
    const res = await fetch(c.url, { headers: { "User-Agent": "PuraVidaNaturalSite/1.0 product-image-agent" } });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function toWebp(buf: Buffer): Promise<Buffer | null> {
  try {
    const img = sharp(buf, { failOn: "none" }).rotate();
    const meta = await img.metadata();
    if (!meta.width || meta.width < 600) return null;
    return await img.resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch {
    return null;
  }
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  loadEnv();
  const args = parseArgs();
  const push = Boolean(args.push);
  const min = Number(args.min ?? 55);
  const only = typeof args.only === "string" ? new Set(String(args.only).split(",").map((s) => s.trim())) : null;
  const limit = args.limit ? Number(args.limit) : Infinity;
  const useParent = !args["no-parent"];

  const supabase = serviceClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const { data, error } = await supabase.from("products").select("id, name, slug, botanical_name, category_id, image_path, active_ingredient").order("name");
  if (error) throw new Error(error.message);
  const all = (data ?? []) as Product[];

  // A product counts as having an image only if its file really loads.
  const broken = new Set<string>();
  if (args.recheck) {
    for (const p of all.filter((x) => x.image_path)) {
      const res = await fetch(`${supabaseUrl}/storage/v1/object/public/${BUCKET}/${p.image_path}`, { method: "HEAD" }).catch(() => null);
      if (!res || !res.ok) broken.add(p.slug);
    }
    console.log(`  recheck: ${broken.size} products point at a missing file`);
  }

  const has = (p: Product) => Boolean(p.image_path) && !broken.has(p.slug);
  const haveImage = new Map(all.filter(has).map((p) => [p.slug, p]));
  let todo = all.filter((p) => !has(p) && (!only || only.has(p.slug)));
  if (Number.isFinite(limit)) todo = todo.slice(0, limit);

  console.log(`\n  ${all.length} products · ${haveImage.size} have an image · ${todo.length} to fill · min score ${min}${push ? " · PUSH ON" : " · dry (no database writes)"}\n`);
  fs.mkdirSync(OUT, { recursive: true });

  const usedUrls = new Set<string>();
  const choices: Choice[] = [];
  const buffers = new Map<string, Buffer>();

  const manifestPath = path.join(OUT, "manifest.json");
  const reuse = Boolean(args.reuse) && fs.existsSync(manifestPath);
  if (reuse) {
    const prev = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Choice[];
    for (const c of prev) {
      choices.push(c);
      if (c.method === "direct" && c.file) buffers.set(c.slug, fs.readFileSync(path.join(OUT, c.file)));
    }
    console.log(`  --reuse: using ${prev.length} results from the last run (no searching)`);
  }

  // ── Pass 1: direct search ────────────────────────────────────────
  for (const [i, p] of reuse ? [] : todo.entries()) {
    process.stdout.write(`  [${String(i + 1).padStart(2)}/${todo.length}] ${p.name.slice(0, 38).padEnd(38)} `);
    let best: { c: Candidate; s: number; q: string } | null = null;
    for (const q of ladder(p)) {
      let cands: Candidate[] = [];
      try {
        cands = await searchAll(q);
      } catch {
        /* one failed source must not stop the run */
      }
      for (const c of cands) {
        const s = score(p, c, usedUrls);
        if (s > (best?.s ?? 0)) best = { c, s, q };
      }
      if (best && best.s >= min + 15) break; // clearly good: stop early
      await sleep(250);
    }

    if (best && best.s >= min) {
      const raw = await download(best.c);
      const webp = raw && (await toWebp(raw));
      if (webp) {
        const file = `${p.slug}.webp`;
        fs.writeFileSync(path.join(OUT, file), webp);
        buffers.set(p.slug, webp);
        usedUrls.add(best.c.url);
        choices.push({ slug: p.slug, name: p.name, method: "direct", query: best.q, score: best.s, candidate: best.c, file });
        console.log(`✔ ${best.s} ${best.c.source} "${best.q}"`);
        continue;
      }
    }
    choices.push({ slug: p.slug, name: p.name, method: "none", score: best?.s, note: best ? `best ${best.s} below ${min}` : "no candidate" });
    console.log(best ? `· weak (${best.s})` : "· none");
  }

  // ── Pass 2: parent product fallback ──────────────────────────────
  if (useParent && !reuse) {
    const resolved = new Map(haveImage);
    for (const ch of choices.filter((c) => c.method === "direct")) {
      const pr = todo.find((t) => t.slug === ch.slug)!;
      resolved.set(ch.slug, { ...pr, image_path: `${ch.slug}.webp` });
    }
    for (const ch of choices.filter((c) => c.method === "none")) {
      const p = todo.find((t) => t.slug === ch.slug)!;
      const parent = findParent(p, resolved);
      if (parent) {
        ch.method = "parent";
        ch.parent = parent.slug;
        ch.file = parent.image_path!;
        ch.note = `uses ${parent.name}`;
      }
    }
  }

  // ── Report ───────────────────────────────────────────────────────
  const found = choices.filter((c) => c.method === "direct").length;
  const viaParent = choices.filter((c) => c.method === "parent").length;
  const none = choices.filter((c) => c.method === "none");
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(choices, null, 2));
  fs.writeFileSync(path.join(OUT, "report.html"), report(choices, supabaseUrl));
  console.log(`\n  found directly: ${found} · via parent product: ${viaParent} · still without: ${none.length}`);
  if (none.length) console.log(`  needs a human: ${none.map((c) => c.name).join(", ")}`);
  console.log(`  review sheet: ${path.join(OUT, "report.html")}`);

  if (!push) {
    console.log("\n  Nothing was written to Supabase. Re-run with `npm run images:push` to upload.\n");
    return;
  }

  // ── Push ─────────────────────────────────────────────────────────
  const attribution: Record<string, unknown> = fs.existsSync(ATTRIBUTION) ? JSON.parse(fs.readFileSync(ATTRIBUTION, "utf8")) : {};
  let pushed = 0;
  let failed = 0;
  for (const ch of choices.filter((c) => c.method !== "none")) {
    const p = todo.find((t) => t.slug === ch.slug)!;
    try {
      let key: string;
      if (ch.method === "direct") {
        key = `${ch.slug}.webp`;
        const buf = buffers.get(ch.slug)!;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(key, buf, { contentType: "image/webp", upsert: true });
        if (upErr) throw new Error(upErr.message);
        const c = ch.candidate!;
        attribution[ch.slug] = { productName: p.name, commonsTitle: c.title, sourceUrl: c.pageUrl, license: c.license, artist: c.artist, source: c.source };
      } else {
        key = ch.file!; // the parent's existing object: no duplicate upload
        const parentCredit = attribution[ch.parent!] as Record<string, unknown> | undefined;
        const direct = choices.find((x) => x.slug === ch.parent && x.candidate);
        attribution[ch.slug] = {
          ...(parentCredit ?? (direct ? { commonsTitle: direct.candidate!.title, sourceUrl: direct.candidate!.pageUrl, license: direct.candidate!.license, artist: direct.candidate!.artist } : {})),
          productName: p.name,
          representativeOf: ch.parent,
        };
      }
      const { error: dbErr } = await supabase.from("products").update({ image_path: key }).eq("id", p.id);
      if (dbErr) throw new Error(dbErr.message);
      pushed++;
    } catch (e) {
      failed++;
      console.error(`  ✘ ${ch.name}: ${(e as Error).message}`);
    }
  }
  fs.writeFileSync(ATTRIBUTION, JSON.stringify(attribution, null, 2));
  console.log(`\n  pushed ${pushed} product image(s)${failed ? `, ${failed} failed` : ""}. Credits saved to ${path.relative(process.cwd(), ATTRIBUTION)}.`);
  console.log("  The site picks them up within an hour (or on the next deploy).\n");
}

function report(choices: Choice[], supabaseUrl: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const rows = choices
    .map((c) => {
      const img = c.method === "direct" ? c.file! : c.method === "parent" ? `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${c.file}` : "";
      const src = c.candidate ? `${esc(c.candidate.source)} · ${esc(c.candidate.license)} · ${esc(c.candidate.artist)}<br><a href="${c.candidate.pageUrl}">${esc(c.candidate.title)}</a>` : c.note ? esc(c.note) : "";
      const tone = c.method === "direct" ? "#e8f5e9" : c.method === "parent" ? "#fff8e1" : "#ffebee";
      return `<tr style="background:${tone}"><td>${img ? `<img src="${img}" width="150">` : "—"}</td><td><b>${esc(c.name)}</b><br><small>${c.slug}</small></td><td>${c.method}${c.score ? ` (${c.score})` : ""}${c.query ? `<br><small>“${esc(c.query)}”</small>` : ""}</td><td><small>${src}</small></td></tr>`;
    })
    .join("\n");
  return `<!doctype html><meta charset="utf-8"><title>Product image agent report</title><style>body{font:14px system-ui;margin:24px}table{border-collapse:collapse;width:100%}td{padding:8px;border-bottom:1px solid #ddd;vertical-align:top}</style><h1>Product image agent report</h1><p>Green = found directly · Amber = uses the parent product's photo · Red = still needs a photo.</p><table>${rows}</table>`;
}

main().catch((e) => {
  console.error("\n  " + (e instanceof Error ? e.message : e));
  process.exit(1);
});
