/**
 * Renders a JSON-LD document into a script tag.
 *
 * Content is always built server-side from our own database or
 * constants — never from user input — so serialising it here is safe.
 * `<` is escaped so a stray character in product copy cannot break out
 * of the script element.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
