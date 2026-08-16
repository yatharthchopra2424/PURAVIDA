import Image from "next/image";

/**
 * Full-bleed image band used to break up long-form pages.
 *
 * Gives the reader a visual pause between text blocks and keeps a
 * story page from reading as one continuous wall — the "banner in
 * between" pattern from the reference layout.
 */
export function ImageBand({
  image,
  imageAlt,
  quote,
  attribution,
  height = "md",
}: {
  image: string;
  imageAlt: string;
  quote?: string;
  attribution?: string;
  height?: "sm" | "md" | "lg";
}) {
  const heights = {
    sm: "min-h-[14rem] lg:min-h-[18rem]",
    md: "min-h-[20rem] lg:min-h-[26rem]",
    lg: "min-h-[26rem] lg:min-h-[32rem]",
  };

  return (
    <section
      className={`relative isolate flex items-center overflow-hidden ${heights[height]}`}
    >
      <Image
        src={image}
        alt={imageAlt}
        fill
        sizes="100vw"
        quality={82}
        className="-z-10 object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-emerald-950/85 via-emerald-950/55 to-emerald-950/20"
      />

      {quote && (
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
          <figure className="max-w-3xl">
            <span
              aria-hidden="true"
              className="mb-4 block h-px w-16 bg-[#D4AF37]"
            />
            <blockquote className="font-heading text-2xl font-bold leading-snug text-white sm:text-3xl lg:text-[2.4rem] lg:leading-[1.15]">
              {quote}
            </blockquote>
            {attribution && (
              <figcaption className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                {attribution}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </section>
  );
}
