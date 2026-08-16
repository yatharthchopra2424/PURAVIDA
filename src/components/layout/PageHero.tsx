import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Banner for interior pages.
 *
 * Also solves a layout bug: the site header is `position: fixed`, and
 * `<main>` carries no top padding. The homepage gets away with it
 * because its hero is full-viewport and designed to sit under the
 * header — but every other page rendered *underneath* it, hiding the
 * first ~180px of content. This banner reserves that space explicitly
 * via its top padding, so any page using it clears the header.
 */

type Crumb = { label: string; href?: string };

export function PageHero({
  title,
  subtitle,
  image,
  imageAlt,
  crumbs = [],
}: {
  title: string;
  subtitle?: string;
  image: string;
  imageAlt: string;
  crumbs?: Crumb[];
}) {
  return (
    <>
      <section className="relative isolate flex min-h-[clamp(20rem,38vw,26rem)] items-end overflow-hidden">
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          quality={82}
          className="-z-10 object-cover object-center"
        />
        {/* Legibility scrim — the banner art is bright, so text needs a
            floor to sit on. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-emerald-950/85 via-emerald-950/55 to-emerald-950/25"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 h-2 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
        />

        {/* pt clears the fixed TopBar + Header stack */}
        <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-[11rem] sm:px-6 lg:pb-16 lg:pt-[13rem]">
          <div className="max-w-3xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
              PuraVida Natural
            </span>
            <h1 className="font-heading text-4xl font-black leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Breadcrumb rail */}
      {crumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="border-b border-emerald-100 bg-emerald-50/60"
        >
          <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-1.5 px-4 py-3.5 text-sm sm:px-6">
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              return (
                <li key={crumb.label} className="flex items-center gap-1.5">
                  {index > 0 && (
                    <ChevronRight
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-emerald-400"
                    />
                  )}
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="font-medium text-emerald-700 transition-colors hover:text-emerald-900 hover:underline"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isLast ? "page" : undefined}
                      className="font-semibold text-gray-700"
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </>
  );
}
