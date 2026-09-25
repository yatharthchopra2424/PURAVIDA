import { History, AlertTriangle } from "lucide-react";
import { createSupabaseServiceClient } from "@/lib/supabase-service";

export const metadata = { title: "Activity log — PuraVida Admin" };
export const dynamic = "force-dynamic";

interface Row {
  id: number;
  created_at: string;
  email: string | null;
  method: string;
  path: string;
  action: string;
  ip: string | null;
}

const TONE: Record<string, string> = {
  delete: "text-red-300 bg-red-500/10 ring-red-500/20",
  send: "text-orange-300 bg-orange-500/10 ring-orange-500/20",
  export: "text-sky-300 bg-sky-500/10 ring-sky-500/20",
};

/** Last 300 admin changes and exports (see src/lib/admin-audit.ts). */
export default async function ActivityPage() {
  const { data, error } = await createSupabaseServiceClient()
    .from("admin_audit_log")
    .select("id, created_at, email, method, path, action, ip")
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800">
          <History className="h-5 w-5 text-zinc-300" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Activity log</h1>
          <p className="text-sm text-zinc-500">Every change, email send and data export made in the admin panel</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Run <code>scripts/admin-audit-schema.sql</code> in Supabase to start recording activity.
        </div>
      )}

      {!error && rows.length === 0 && (
        <p className="rounded-2xl border border-zinc-800 py-16 text-center text-sm text-zinc-500">No activity recorded yet.</p>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Action</th>
                <th className="hidden px-4 py-3 md:table-cell">Record</th>
                <th className="hidden px-4 py-3 lg:table-cell">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map((r) => {
                const verb = r.action.split(".").pop() ?? "";
                return (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-zinc-400">
                      {new Date(r.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-300">{r.email ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-md px-2 py-0.5 font-mono text-xs ring-1 ${TONE[verb] ?? "text-zinc-300 bg-zinc-800 ring-zinc-700"}`}>
                        {r.action}
                      </span>
                    </td>
                    <td className="hidden max-w-xs truncate px-4 py-2.5 font-mono text-xs text-zinc-500 md:table-cell">{r.path.replace("/api/admin", "")}</td>
                    <td className="hidden px-4 py-2.5 text-xs text-zinc-500 lg:table-cell">{r.ip ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
