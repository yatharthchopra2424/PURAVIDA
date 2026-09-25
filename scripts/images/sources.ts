/**
 * sources.ts: image search adapters for the product-image agent.
 *
 * Every adapter returns the same Candidate shape and ONLY candidates with
 * a free licence that allows commercial use (public domain, CC0, CC BY,
 * CC BY-SA). Non-commercial (NC) and no-derivatives (ND) licences are
 * dropped here, so nothing unusable can reach the download step.
 *
 *   commons    Wikimedia Commons     no key needed, best for botanical photos
 *   openverse  Openverse (CC search) no key needed (rate limited when anonymous)
 *   pexels     Pexels                optional: set PEXELS_API_KEY (free)
 *   pixabay    Pixabay               optional: set PIXABAY_API_KEY (free)
 */

export interface Candidate {
  source: "commons" | "openverse" | "pexels" | "pixabay";
  title: string;
  /** Direct URL to a usable-size image file. */
  url: string;
  /** Page a human can open to see the licence and author. */
  pageUrl: string;
  license: string;
  artist: string;
  width: number;
  height: number;
  mime: string;
}

const UA = "PuraVidaNaturalSite/1.0 (https://www.puravidanaturalindia.com; contact: rk@puravidanaturalindia.com) product-image-agent";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Free-for-commercial-use licences only. */
export function licenseAllowed(name: string): boolean {
  const l = name.toLowerCase().trim();
  if (!l) return false;
  if (/\b(nc|nd)\b|non-?commercial|no-?deriv/.test(l.replace(/-/g, " "))) return false;
  return /^(cc0|cc[- ]?zero|public domain|pd\b|pdm|cc[- ]by(?:[- ]sa)?\b|pexels license|pixabay (content )?license|attribution)/.test(l) || /^(cc[- ]by)/.test(l);
}

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

async function getJson(url: string, headers: Record<string, string> = {}, retries = 2): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
    if (res.status === 429 && attempt < retries) {
      await sleep(2500 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${new URL(url).hostname}`);
    return res.json();
  }
}

// ── Wikimedia Commons ──────────────────────────────────────────────
export async function searchCommons(term: string, limit = 12): Promise<Candidate[]> {
  const search = await getJson(
    `https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srsearch=${encodeURIComponent(term)}&srlimit=${limit}&format=json`
  );
  const titles: string[] = (search.query?.search ?? []).map((r: any) => r.title);
  if (!titles.length) return [];
  const info = await getJson(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles.join("|"))}&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1400&format=json`
  );
  const out: Candidate[] = [];
  for (const page of Object.values<any>(info.query?.pages ?? {})) {
    const ii = page.imageinfo?.[0];
    if (!ii || !ii.mime?.startsWith("image/") || ii.mime === "image/svg+xml") continue;
    const meta = ii.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value ?? "");
    if (!licenseAllowed(license)) continue;
    out.push({
      source: "commons",
      title: page.title,
      url: ii.thumburl || ii.url,
      pageUrl: ii.descriptionshorturl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
      license,
      artist: stripHtml(meta.Artist?.value ?? "") || "Unknown",
      width: ii.width ?? 0,
      height: ii.height ?? 0,
      mime: ii.mime,
    });
  }
  return out;
}

// ── Openverse ──────────────────────────────────────────────────────
export async function searchOpenverse(term: string, limit = 12): Promise<Candidate[]> {
  const data = await getJson(
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(term)}&license=cc0,pdm,by,by-sa&page_size=${limit}&mature=false`
  );
  const out: Candidate[] = [];
  for (const r of data.results ?? []) {
    const license = `${String(r.license).toUpperCase() === "PDM" ? "Public domain" : "CC " + String(r.license).toUpperCase()} ${r.license_version ?? ""}`.trim();
    if (!licenseAllowed(license)) continue;
    out.push({
      source: "openverse",
      title: r.title || term,
      url: r.url,
      pageUrl: r.foreign_landing_url || r.url,
      license,
      artist: r.creator || "Unknown",
      width: r.width ?? 0,
      height: r.height ?? 0,
      mime: /png/i.test(r.filetype ?? "") ? "image/png" : "image/jpeg",
    });
  }
  return out;
}

// ── Pexels (optional key) ──────────────────────────────────────────
export async function searchPexels(term: string, limit = 10): Promise<Candidate[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const data = await getJson(`https://api.pexels.com/v1/search?query=${encodeURIComponent(term)}&per_page=${limit}`, { Authorization: key });
  return (data.photos ?? []).map((p: any) => ({
    source: "pexels" as const,
    title: p.alt || term,
    url: p.src?.large2x || p.src?.large,
    pageUrl: p.url,
    license: "Pexels License",
    artist: p.photographer || "Unknown",
    width: p.width ?? 0,
    height: p.height ?? 0,
    mime: "image/jpeg",
  }));
}

// ── Pixabay (optional key) ─────────────────────────────────────────
export async function searchPixabay(term: string, limit = 10): Promise<Candidate[]> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return [];
  const data = await getJson(`https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(term)}&image_type=photo&per_page=${limit}&safesearch=true`);
  return (data.hits ?? []).map((p: any) => ({
    source: "pixabay" as const,
    title: p.tags || term,
    url: p.largeImageURL,
    pageUrl: p.pageURL,
    license: "Pixabay Content License",
    artist: p.user || "Unknown",
    width: p.imageWidth ?? 0,
    height: p.imageHeight ?? 0,
    mime: "image/jpeg",
  }));
}

export async function searchAll(term: string): Promise<Candidate[]> {
  const settled = await Promise.allSettled([searchCommons(term), searchOpenverse(term), searchPexels(term), searchPixabay(term)]);
  return settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
}
