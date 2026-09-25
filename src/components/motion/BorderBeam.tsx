/**
 * A thin light that travels around the edge of its parent (the "Border
 * Beam" pattern). Put it inside any `relative` container with rounded
 * corners. CSS only; hidden for reduced-motion users.
 */
export function BorderBeam({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`border-beam pointer-events-none absolute inset-0 rounded-[inherit] ${className}`} />;
}
