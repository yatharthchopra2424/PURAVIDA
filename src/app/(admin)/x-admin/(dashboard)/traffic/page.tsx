import Link from "next/link";
import { BarChart3, Users, Eye, ShoppingBag, Send, Sparkles, AlertTriangle } from "lucide-react";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { AI_SOURCES } from "@/lib/traffic";

export const metadata = { title: "Traffic — PuraVida Admin" };
export const dynamic = "force-dynamic";

interface Row {
  created_at: string;
  event: string;
  path: string;
  session_id: string | null;
  source: string | null;
  country: string | null;
  device: string | null;
  product_slug: string | null;
  utm_campaign: string | null;
}

const RANGES = [7, 30, 90] as const;

const hostOf = (url: string | null) => {
  try {
    return url ? new URL(url).hostname.replace(/^www./, "") : null;
  } catch {
    return null;
  }
};

function top<T extends string>(values: (T | null)[], n = 8): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function Bars({ rows, total, accent = "bg-emerald-500" }: { rows: [string, number][]; total: number; accent?: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-zinc-600">No data yet</p>;
  const max = rows[0][1];
  return (
    <ul className="space-y-2">
      {rows.map(([label, n]) => (
        <li key={label} className="text-sm">
          <div className="mb-1 flex justify-between gap-3">
            <span className="truncate text-zinc-300">{label}</span>
            <span className="tabular-nums text-zinc-500">
              {n.toLocaleString("en-IN")} <span className="text-zinc-600">· {total ? Math.round((n / total) * 100) : 0}%</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800">
            <div className={`h-1.5 rounded-full ${accent}`} style={{ width: `${Math.max(4, (n / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 ${className}`}>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

export default async function TrafficPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: daysParam } = await searchParams;
  const days = (RANGES as readonly number[]).includes(Number(daysParam)) ? Number(daysParam) : 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const supabase = createSupabaseServiceClient();
  const rows: Row[] = [];
  let missing = false;
  for (let from = 0; from < 200_000; from += 1000) {
    const { data, error } = await supabase
      .from("site_events")
      .select("created_at, event, path, session_id, source, country, device, product_slug, utm_campaign")
      .gte("created_at", since)
      .order("id")
      .range(from, from + 999);
    if (error) {
      missing = true;
      break;
    }
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }

  const views = rows.filter((r) => r.event === "pageview");
  const sessions = new Set(views.map((r) => r.session_id).filter(Boolean));
  // First page view of each session carries its acquisition source.
  const firstBySession = new Map<string, Row>();
  for (const r of views) if (r.session_id && !firstBySession.has(r.session_id)) firstBySession.set(r.session_id, r);
  const landings = [...firstBySession.values()];
  const sessionsWith = (event: string) => new Set(rows.filter((r) => r.event === event).map((r) => r.session_id)).size;

  const productViews = new Set(views.filter((r) => r.product_slug).map((r) => r.session_id)).size;
  const added = sessionsWith("add_to_quote");
  const started = sessionsWith("form_start");
  const submitted = sessionsWith("form_submit");
  const aiSessions = landings.filter((r) => AI_SOURCES.includes((r.source ?? "") as (typeof AI_SOURCES)[number])).length;

  // Daily series
  const daily = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) daily.set(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10), 0);
  for (const r of views) {
    const d = r.created_at.slice(0, 10);
    if (daily.has(d)) daily.set(d, (daily.get(d) ?? 0) + 1);
  }
  const series = [...daily.entries()];
  const peak = Math.max(1, ...series.map(([, n]) => n));

  const { data: recentLeads } = await supabase
    .from("website_leads")
    .select("id, created_at, name, company, country, utm_source, referrer, status")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(8);

  const kpis = [
    { label: "Visitors", value: sessions.size, icon: Users },
    { label: "Page views", value: views.length, icon: Eye },
    { label: "Added to quote", value: added, icon: ShoppingBag },
    { label: "Quote requests", value: submitted, icon: Send },
    { label: "From AI assistants", value: aiSessions, icon: Sparkles },
  ];
  const funnel = [
    ["Visited", sessions.size],
    ["Viewed a product", productViews],
    ["Added to quote", added],
    ["Started the form", started],
    ["Submitted", submitted],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15">
            <BarChart3 className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Traffic</h1>
            <p className="text-sm text-zinc-500">Anonymous, cookie-free visits to the public site</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {RANGES.map((d) => (
            <Link
              key={d}
              href={`/x-admin/traffic?days=${d}`}
              className={`flex h-9 items-center rounded-lg px-3 text-sm font-medium ${
                d === days ? "bg-zinc-100 text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {d} days
            </Link>
          ))}
        </div>
      </div>

      {missing && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          The <code>site_events</code> table doesn&apos;t exist yet. Run <code>scripts/website-schema.sql</code> in Supabase and deploy.
          Visits are recorded from then on.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <k.icon className="mb-3 h-4 w-4 text-zinc-500" />
            <p className="text-2xl font-bold tabular-nums text-zinc-100">{k.value.toLocaleString("en-IN")}</p>
            <p className="text-xs text-zinc-500">{k.label}</p>
          </div>
        ))}
      </div>

      <Card title={`Page views per day · last ${days} days`}>
        <div className="flex h-40 items-end gap-[2px]">
          {series.map(([d, n]) => (
            <div key={d} className="group relative flex-1" title={`${d}: ${n}`}>
              <div className="w-full rounded-t bg-sky-500/70 transition-colors group-hover:bg-sky-400" style={{ height: `${(n / peak) * 150 + (n ? 2 : 0)}px` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-zinc-600">
          <span>{series[0]?.[0]}</span>
          <span>{series[series.length - 1]?.[0]}</span>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Quote funnel (visitors)">
          <ul className="space-y-3">
            {funnel.map(([label, n], i) => {
              const base = funnel[0][1] || 1;
              const prev = i ? funnel[i - 1][1] || 1 : base;
              return (
                <li key={label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-zinc-300">{label}</span>
                    <span className="tabular-nums text-zinc-400">
                      {n.toLocaleString("en-IN")}
                      {i > 0 && <span className="ml-2 text-xs text-zinc-600">{Math.round((n / prev) * 100)}% of previous</span>}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800">
                    <div className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: `${Math.max(2, (n / base) * 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card title="Where visitors come from">
          <Bars rows={top(landings.map((r) => r.source))} total={landings.length} accent="bg-violet-500" />
        </Card>
        <Card title="Top pages">
          <Bars rows={top(views.map((r) => r.path), 10)} total={views.length} />
        </Card>
        <Card title="Most viewed products">
          <Bars rows={top(views.map((r) => r.product_slug), 10)} total={views.filter((r) => r.product_slug).length} accent="bg-orange-500" />
        </Card>
        <Card title="Countries">
          <Bars rows={top(landings.map((r) => r.country))} total={landings.length} accent="bg-sky-500" />
        </Card>
        <Card title="Devices & campaigns">
          <Bars rows={top(landings.map((r) => r.device), 3)} total={landings.length} accent="bg-zinc-400" />
          <div className="mt-5">
            <Bars rows={top(landings.map((r) => r.utm_campaign), 5)} total={landings.length} accent="bg-pink-500" />
          </div>
        </Card>
      </div>

      <Card title="Latest website leads in this period">
        {!recentLeads?.length ? (
          <p className="py-4 text-sm text-zinc-600">None yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {recentLeads.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 truncate text-zinc-200">
                  {l.name}
                  <span className="text-zinc-500">{l.company ? ` · ${l.company}` : ""}{l.country ? ` · ${l.country}` : ""}</span>
                </span>
                <span className="whitespace-nowrap text-xs text-zinc-500">
                  {l.utm_source || hostOf(l.referrer) || "direct"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/x-admin/website-leads" className="mt-3 inline-block text-sm font-medium text-orange-400 hover:underline">
          Open Website Leads →
        </Link>
      </Card>
    </div>
  );
}
