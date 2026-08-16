"use client";

import React, { useMemo, useState } from "react";
import { Check, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductFiltersProps {
  applications: string[];
  activeIngredients: string[];
  selectedApplications: string[];
  selectedIngredients: string[];
  onApplicationChange: (apps: string[]) => void;
  onIngredientChange: (ingredients: string[]) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function ProductFilters({
  applications,
  activeIngredients,
  selectedApplications,
  selectedIngredients,
  onApplicationChange,
  onIngredientChange,
  sortBy,
  onSortChange,
}: ProductFiltersProps) {
  const [ingredientQuery, setIngredientQuery] = useState("");

  const toggleApplication = (app: string) => {
    if (selectedApplications.includes(app)) {
      onApplicationChange(selectedApplications.filter((a) => a !== app));
    } else {
      onApplicationChange([...selectedApplications, app]);
    }
  };

  const toggleIngredient = (ingredient: string) => {
    if (selectedIngredients.includes(ingredient)) {
      onIngredientChange(selectedIngredients.filter((i) => i !== ingredient));
    } else {
      onIngredientChange([...selectedIngredients, ingredient]);
    }
  };

  // Active-ingredient names are long chemical strings, so scanning a
  // scrollable list of them is slow. Filtering the list is far quicker.
  // Selected values always stay visible, even if they don't match.
  const visibleIngredients = useMemo(() => {
    const query = ingredientQuery.trim().toLowerCase();
    if (!query) return activeIngredients;
    return activeIngredients.filter(
      (ingredient) =>
        ingredient.toLowerCase().includes(query) ||
        selectedIngredients.includes(ingredient)
    );
  }, [activeIngredients, ingredientQuery, selectedIngredients]);

  const totalSelected =
    selectedApplications.length + selectedIngredients.length;

  return (
    <aside className="space-y-7 lg:sticky lg:top-[11rem] lg:self-start">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-900">
          <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          Filters
        </span>
        {totalSelected > 0 && (
          <span className="rounded-full bg-emerald px-2 py-0.5 text-[11px] font-bold text-white">
            {totalSelected}
          </span>
        )}
      </div>

      {/* Sort */}
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-black">
          Sort By
        </h4>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black focus:border-emerald focus:outline-none focus:ring-1 focus:ring-emerald"
        >
          <option value="popularity">Popularity</option>
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
        </select>
      </div>

      {/* Active Ingredients */}
      {activeIngredients.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-black">
              Active Ingredient
            </h4>
            {selectedIngredients.length > 0 && (
              <button
                onClick={() => onIngredientChange([])}
                className="text-[11px] font-semibold text-orange-500 transition-colors hover:text-orange-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Search within the list */}
          <div className="relative mb-2">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={ingredientQuery}
              onChange={(e) => setIngredientQuery(e.target.value)}
              placeholder="Search ingredients…"
              aria-label="Search active ingredients"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-8 text-xs text-black placeholder:text-gray-400 focus:border-emerald focus:outline-none focus:ring-1 focus:ring-emerald"
            />
            {ingredientQuery && (
              <button
                onClick={() => setIngredientQuery("")}
                aria-label="Clear ingredient search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/*
            data-lenis-prevent is what makes this list scrollable.
            Lenis is mounted on the root with smoothWheel enabled, so it
            intercepts every wheel event and scrolls the page — a nested
            overflow-y-auto container never receives one. This attribute
            tells Lenis to leave wheel/touch events alone here so the
            browser's native scrolling takes over on hover.
          */}
          <div
            data-lenis-prevent
            className="filter-scroll max-h-64 space-y-1 overflow-y-auto overscroll-contain rounded-lg border border-gray-100 bg-gray-50/50 p-1.5"
          >
            {visibleIngredients.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-gray-400">
                No ingredients match “{ingredientQuery}”
              </p>
            ) : (
              visibleIngredients.map((ingredient) => {
                const isSelected = selectedIngredients.includes(ingredient);
                return (
                  <label
                    key={ingredient}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors",
                      isSelected
                        ? "bg-emerald-50 text-emerald-900"
                        : "hover:bg-white"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-all",
                        isSelected
                          ? "border-emerald bg-emerald"
                          : "border-gray-300 bg-white"
                      )}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      )}
                    </span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleIngredient(ingredient)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        "leading-snug",
                        isSelected ? "font-medium" : "text-black"
                      )}
                    >
                      {ingredient}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <p className="mt-2 text-[11px] text-gray-400">
            {visibleIngredients.length} of {activeIngredients.length} shown
          </p>
        </div>
      )}

      {/* Applications */}
      {applications.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-black">
              Application
            </h4>
            {selectedApplications.length > 0 && (
              <button
                onClick={() => onApplicationChange([])}
                className="text-[11px] font-semibold text-orange-500 transition-colors hover:text-orange-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Long application lists need the same Lenis opt-out. */}
          <div
            data-lenis-prevent
            className="filter-scroll max-h-56 overflow-y-auto overscroll-contain pr-1"
          >
            <div className="flex flex-wrap gap-1.5">
              {applications.map((app) => {
                const isSelected = selectedApplications.includes(app);
                return (
                  <button
                    key={app}
                    onClick={() => toggleApplication(app)}
                    aria-pressed={isSelected}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                      isSelected
                        ? "bg-emerald text-white shadow-sm shadow-emerald/25"
                        : "bg-gray-100 text-black hover:bg-gray-200"
                    )}
                  >
                    {app}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Clear all */}
      {totalSelected > 0 && (
        <button
          onClick={() => {
            onApplicationChange([]);
            onIngredientChange([]);
            setIngredientQuery("");
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs font-bold text-orange-600 transition-colors hover:bg-orange-100"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Clear all filters
        </button>
      )}
    </aside>
  );
}
