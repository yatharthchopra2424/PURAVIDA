import { cn } from "@/lib/utils";

/**
 * Endless horizontal ticker (the "Marquee" pattern). Pure CSS: the track
 * holds two copies of the items and slides by exactly half its width, so
 * the loop is seamless. Pauses on hover, and is a static, wrapping row
 * for reduced-motion users. Server component: no JavaScript shipped.
 */
export function Marquee({
  children,
  className,
  duration = 40,
}: {
  children: React.ReactNode;
  className?: string;
  duration?: number;
}) {
  return (
    <div
      className={cn("marquee group relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]", className)}
      style={{ ["--marquee-duration" as string]: `${duration}s` }}
    >
      <div className="marquee-track flex min-w-max shrink-0 items-center gap-10 pr-10">{children}</div>
      <div aria-hidden="true" className="marquee-track flex min-w-max shrink-0 items-center gap-10 pr-10">
        {children}
      </div>
    </div>
  );
}
