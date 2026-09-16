/**
 * Snaps an AI-suggested product name onto a real catalogue product.
 *
 * The model is told to copy names verbatim and mostly does — 96% of
 * suggestions matched exactly on the first full run. The rest were
 * near-misses like "Curcumin Extract" for "Curcumin 95% Extract", which
 * would put a product the website does not list into a sales email.
 *
 * Rule: an exact (case-insensitive) match wins; otherwise the candidate
 * must contain every word of the suggestion, and the one with the fewest
 * extra words is chosen. No such candidate means the suggestion is
 * dropped rather than guessed at.
 */

function words(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

export function snapToCatalogue(
  suggestion: string,
  catalogue: readonly string[]
): string | null {
  const wanted = suggestion.trim().toLowerCase();
  const exact = catalogue.find((c) => c.trim().toLowerCase() === wanted);
  if (exact) return exact;

  const need = words(suggestion);
  if (need.length === 0) return null;

  let best: { name: string; extra: number } | null = null;
  for (const candidate of catalogue) {
    const have = new Set(words(candidate));
    if (!need.every((w) => have.has(w))) continue;
    const extra = have.size - need.length;
    if (!best || extra < best.extra) best = { name: candidate, extra };
  }
  return best?.name ?? null;
}

/** Maps a whole suggestion list, de-duplicating after snapping. */
export function snapAll(
  suggestions: readonly string[],
  catalogue: readonly string[]
): string[] {
  const out: string[] = [];
  for (const s of suggestions) {
    const snapped = snapToCatalogue(s, catalogue);
    if (snapped && !out.includes(snapped)) out.push(snapped);
  }
  return out;
}
