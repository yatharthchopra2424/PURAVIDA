/**
 * indexnow.ts: tells Bing, Yandex and other IndexNow search engines that
 * URLs have been added or changed, so they are crawled in minutes instead
 * of days (Bing's own recommendation for this site).
 *
 *   npm run seo:indexnow                 # submit every URL in the live sitemap
 *   npm run seo:indexnow -- /guides/x    # submit specific paths
 *
 * Run it AFTER a deploy: the key file below must already be live at
 * https://www.puravidanaturalindia.com/<key>.txt or the engines reject it.
 * One request covers up to 10,000 URLs; IndexNow is free and needs no account.
 */
const HOST = "www.puravidanaturalindia.com";
const KEY = "96da217594573022c990f898e2cf0e04";

async function main() {
  const args = process.argv.slice(2).filter((a) => a.startsWith("/"));
  let urls: string[];
  if (args.length) {
    urls = args.map((p) => `https://${HOST}${p}`);
  } else {
    const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  }
  if (!urls.length) throw new Error("No URLs to submit");

  // The key file must be reachable first, or the submission is rejected.
  const check = await fetch(`https://${HOST}/${KEY}.txt`);
  if (!check.ok || (await check.text()).trim() !== KEY) {
    throw new Error(`Key file not live yet at https://${HOST}/${KEY}.txt: deploy first.`);
  }

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls.slice(0, 10000) }),
  });
  // 200 = received, 202 = accepted (key validation pending), 400/403/422 = problem.
  console.log(`IndexNow: ${res.status} ${res.statusText} for ${urls.length} URL(s)`);
  if (![200, 202].includes(res.status)) {
    console.error(await res.text());
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
