"use client";

import React from "react";
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

  return (
    <aside className="space-y-6">
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
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-black">
            Active Ingredient
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {activeIngredients.map((ingredient) => (
              <label
                key={ingredient}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-gray-100"
              >
                <input
                  type="checkbox"
                  checked={selectedIngredients.includes(ingredient)}
                  onChange={() => toggleIngredient(ingredient)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-emerald focus:ring-emerald"
                />
                <span className="text-black">{ingredient}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Applications */}
      {applications.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-black">
            Application
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {applications.map((app) => (
              <button
                key={app}
                onClick={() => toggleApplication(app)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-all",
                  selectedApplications.includes(app)
                    ? "bg-emerald text-white"
                    : "bg-gray-100 text-black hover:bg-gray-200"
                )}
              >
                {app}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear Filters */}
      {(selectedApplications.length > 0 || selectedIngredients.length > 0) && (
        <button
          onClick={() => {
            onApplicationChange([]);
            onIngredientChange([]);
          }}
          className="text-xs font-medium text-orange-500 hover:text-orange-600"
        >
          Clear all filters
        </button>
      )}
    </aside>
  );
}
