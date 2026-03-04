import Link from "next/link";
import { MessageSquare, Clock } from "lucide-react";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  product: string | null;
  is_read: boolean;
  created_at: string;
}

export function RecentInquiries({ inquiries }: { inquiries: Inquiry[] }) {
  if (inquiries.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-heading font-semibold text-base">
            Recent Inquiries
          </h2>
          <MessageSquare className="w-4 h-4 text-zinc-600" />
        </div>
        <p className="text-zinc-500 text-sm text-center py-8">
          No inquiries yet
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-heading font-semibold text-base">
          Recent Inquiries
        </h2>
        <Link
          href="/x-admin/inquiries"
          className="text-emerald-400 text-xs hover:text-emerald-300 transition-colors"
        >
          View all →
        </Link>
      </div>

      <div className="space-y-3">
        {inquiries.map((inq) => (
          <Link
            key={inq.id}
            href="/x-admin/inquiries"
            className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors group"
          >
            <div className="w-8 h-8 bg-zinc-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-zinc-300 text-sm font-semibold">
                {inq.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-zinc-200 text-sm font-medium truncate">
                  {inq.name}
                </span>
                {!inq.is_read && (
                  <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
                )}
              </div>
              <p className="text-zinc-500 text-xs truncate">
                {inq.product || inq.email}
              </p>
            </div>
            <div className="flex items-center gap-1 text-zinc-600 text-xs flex-shrink-0">
              <Clock className="w-3 h-3" />
              {new Date(inq.created_at).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
              })}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
