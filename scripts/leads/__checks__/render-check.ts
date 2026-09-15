/**
 * Smoke check for the campaign renderer. Not a test framework — just a
 * runnable proof that merge, escaping, link rewriting, the pixel and
 * the unsubscribe footer all come out right.
 *
 *   npx tsx scripts/leads/__checks__/render-check.ts
 */
import {
  renderCampaignEmail,
  unknownTokens,
  tidyCompanyName,
  tidyPersonName,
} from "../../../src/lib/campaign-render";
import type { Lead } from "../../../src/lib/leads";

const lead = {
  id: "l1",
  company_name: "AMTEC HEALTH CARE PVT. LTD.",
  contact_name: "Geeta Seshadri",
  salutation: "Ms.",
  designation: "Director",
  email: "geeta@amteclifesciences.com",
  company_email: null,
  city: "Mumbai",
  city_verified: "Mumbai",
  country: "India",
  country_verified: "India",
  state: null,
  state_verified: null,
  segment: "Nutraceutical Brand",
  icebreaker: 'Your <b>CIS</b> distribution & "enzymatic" line stood out.',
  suggested_products: ["Ashwagandha Extract", "Curcumin 95% Extract"],
} as unknown as Lead;

const body = `<p>Dear {{full_name}},</p><p>{{icebreaker}}</p>
<p>For {{company}} the fit is {{products}}.</p>
<p><a href="https://www.puravidanaturalindia.com/products">Catalogue</a>
   <a href="https://evil.example/phish">Elsewhere</a>
   <a href="mailto:rk@puravidanaturalindia.com">Mail us</a></p>
<p>{{sender_name}} · {{nope}}</p>`;

const options = {
  subject: "Botanical extracts for {{company}}",
  bodyHtml: body,
  lead,
  senderName: "Rajesh K",
  trackingId: "11111111-2222-3333-4444-555555555555",
  unsubscribeToken: "99999999-8888-7777-6666-555555555555",
};

/** What actually goes out: no tracking, no unsubscribe furniture. */
const out = renderCampaignEmail(options);

/** The opt-in variant, for the campaigns that ask for numbers. */
const tracked = renderCampaignEmail({ ...options, tracking: true });

const checks: [string, boolean][] = [
  ["subject merged", out.subject === "Botanical extracts for Amtec Health Care Pvt. Ltd."],
  ["greeting uses full name", out.html.includes("Dear Geeta Seshadri,")],
  ["company title-cased", tidyCompanyName(lead.company_name) === "Amtec Health Care Pvt. Ltd."],
  ["products merged", out.html.includes("Ashwagandha Extract, Curcumin 95% Extract")],
  ["merged HTML escaped", out.html.includes("&lt;b&gt;CIS&lt;/b&gt;") && !out.html.includes("<b>CIS</b>")],
  // Default send is untracked: links must reach the site directly, and
  // nothing may announce the message as bulk mail.
  ["links NOT rewritten by default", out.html.includes('href="https://www.puravidanaturalindia.com/products"')],
  ["no open pixel by default", !out.html.includes("/api/t/o/")],
  ["no unsubscribe link", !/unsubscribe/i.test(out.html)],
  ["no unsubscribe in text part", !/unsubscribe/i.test(out.text)],
  ["tracking opt-in rewrites links", tracked.html.includes("/api/t/c/11111111-2222-3333-4444-555555555555?u=")],
  ["tracking opt-in adds pixel", tracked.html.includes("/api/t/o/11111111-2222-3333-4444-555555555555")],
  ["mailto left alone", out.html.includes('href="mailto:rk@puravidanaturalindia.com"')],
  ["unknown token untouched", out.html.includes("{{nope}}")],
  ["unknown token reported", unknownTokens(body).includes("nope")],
  ["text alternative built", out.text.includes("Dear Geeta Seshadri,")],
  ["text carries the signature", out.text.includes("Pura Vida Natural LLP")],
  // The text alternative merges unescaped and then strips markup, so
  // the icebreaker's own tags must not survive into it either.
  ["text strips markup", out.text.includes("Your CIS distribution") && !out.text.includes("<b>")],
  ["off-domain link left untracked", out.html.includes('href="https://evil.example/phish"')],
];

// Greeting names come straight out of a third-party PDF, in whatever
// shape the exhibitor typed them. Anything odd here lands at the very
// top of a cold email, where it is most obviously a mail merge.
for (const [input, want] of [
  ["Bhavik.Parikh", "Bhavik Parikh"],
  ["ANIL JAIN", "Anil Jain"],
  ["  geeta   seshadri ", "Geeta Seshadri"],
  ["R. Kumar", "R. Kumar"],
  ["McBride", "McBride"],
] as const) {
  checks.push([`name tidied: ${input.trim()}`, tidyPersonName(input) === want]);
}

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${name}`);
  if (!ok) failed++;
}

console.log(`\n  ${checks.length - failed}/${checks.length} passed\n`);
if (failed) {
  console.log(out.html);
  process.exit(1);
}
