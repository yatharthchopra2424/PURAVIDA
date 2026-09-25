"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { useCartStore, type QuoteLine, type QuoteUnit } from "@/stores/useCartStore";

const UNITS: { value: QuoteUnit; label: string }[] = [
  { value: "kg", label: "kg (kilograms)" },
  { value: "g", label: "g (grams)" },
  { value: "L", label: "L (litres)" },
  { value: "ml", label: "ml (millilitres)" },
  { value: "MT", label: "MT (metric tonnes)" },
  { value: "units", label: "units / packs" },
];

/** One-tap suggestions for the grade field, chosen by what kind of product it is. */
function suggestionsFor(line: QuoteLine): string[] {
  const cat = (line.product.category ?? "").toLowerCase();
  const out: string[] = [];
  const listed = [line.product.activeIngredient, line.product.concentration].filter(Boolean).join(" ").trim();
  // The listed standardisation is a real grade for extracts and nutraceuticals; for oils and
  // oleoresins it is a chemical composition, which is not something to order by.
  const isGradeLike = !cat.includes("essential") && !cat.includes("oleoresin");
  if (listed && isGradeLike && listed.length <= 44) out.push(listed);
  if (cat.includes("essential")) out.push("Therapeutic grade", "Food grade", "Cosmetic grade");
  else if (cat.includes("oleoresin")) out.push("Food grade", "Encapsulated powder");
  else if (cat.includes("nutraceutical")) out.push("Food grade", "Pharma grade");
  else out.push("40 mesh", "80 mesh", "Food grade");
  return [...new Set(out)].slice(0, 5);
}

const split = (grade: string) => grade.split(",").map((s) => s.trim()).filter(Boolean);

/** Plain-English echo of what the buyer has entered, so they can check it at a glance. */
export function describeLine(line: QuoteLine): string {
  const parts: string[] = [];
  if (line.quantity) parts.push(`${line.quantity.toLocaleString("en-IN")} ${line.unit}`);
  if (line.grade.trim()) parts.push(`grade / spec: ${line.grade.trim()}`);
  return parts.join(" · ");
}

const field =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm placeholder:text-gray-400 focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/20";
const label = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500";

export function QuoteLineFields({ line, compact = false }: { line: QuoteLine; compact?: boolean }) {
  const updateLine = useCartStore((s) => s.updateLine);
  const uid = useId();
  const id = line.product.id;
  const chips = suggestionsFor(line);
  const chosen = new Set(split(line.grade));
  const summary = describeLine(line);

  const toggle = (chip: string) => {
    const next = new Set(chosen);
    if (next.has(chip)) next.delete(chip);
    else next.add(chip);
    updateLine(id, { grade: [...next].join(", ").slice(0, 120) });
  };

  return (
    <div className={compact ? "mt-3 space-y-3" : "mt-4 space-y-3"}>
      <div className={`grid gap-3 ${compact ? "grid-cols-[1fr_1fr]" : "grid-cols-2 sm:grid-cols-[150px_170px]"}`}>
        <div>
          <label htmlFor={`${uid}-q`} className={label}>
            Quantity
          </label>
          <input
            id={`${uid}-q`}
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="e.g. 100"
            value={line.quantity ?? ""}
            onChange={(e) => updateLine(id, { quantity: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
            className={field}
          />
        </div>
        <div>
          <label htmlFor={`${uid}-u`} className={label}>
            Unit
          </label>
          <select id={`${uid}-u`} value={line.unit} onChange={(e) => updateLine(id, { unit: e.target.value as QuoteUnit })} className={field}>
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={`${uid}-g`} className={label}>
          Grade / mesh / specification <span className="font-medium normal-case tracking-normal text-gray-400">(optional)</span>
        </label>
        <input
          id={`${uid}-g`}
          placeholder="e.g. 5% withanolides, 80 mesh, food grade"
          value={line.grade}
          onChange={(e) => updateLine(id, { grade: e.target.value.slice(0, 120) })}
          className={field}
        />
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Quick choices for grade or mesh">
          {chips.map((chip) => {
            const on = chosen.has(chip);
            return (
              <button
                key={chip}
                type="button"
                onClick={() => toggle(chip)}
                aria-pressed={on}
                className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors ${
                  on ? "border-emerald bg-emerald text-white" : "border-gray-200 bg-white text-gray-600 hover:border-emerald hover:text-emerald-700"
                }`}
              >
                {on && <Check className="h-3 w-3" aria-hidden="true" />}
                {chip}
              </button>
            );
          })}
        </div>
      </div>

      {summary ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900" aria-live="polite">
          <span className="font-bold">You&apos;re asking for:</span> {summary}
        </p>
      ) : (
        <p className="text-xs text-gray-500">Leave blank if you&apos;re not sure yet. We&apos;ll suggest suitable grades in the quote.</p>
      )}
    </div>
  );
}
