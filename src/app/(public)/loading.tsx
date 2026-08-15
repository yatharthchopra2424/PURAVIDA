/**
 * Route-level loading fallback.
 *
 * Shown while a Server Component awaits its Supabase queries, so
 * navigation feels immediate instead of blocking on a blank screen.
 */
export default function Loading() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center px-4 py-20"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald/20 border-t-emerald" />
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    </div>
  );
}
