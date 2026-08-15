"use client";

import { useEffect, useState } from "react";
import { Category } from "@/types";

/**
 * Shared category list for client components.
 *
 * Previously every consumer ran its own fetch on mount, so a single page
 * load fired /api/catalog/categories once per component (visible in the
 * dev server log as several identical requests). The result is the same
 * for everyone and changes rarely, so it is fetched once per page load
 * and shared, with in-flight requests de-duplicated.
 */

let cache: Category[] | null = null;
let inFlight: Promise<Category[]> | null = null;
const subscribers = new Set<(categories: Category[]) => void>();

async function loadCategories(): Promise<Category[]> {
  if (cache) return cache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const response = await fetch("/api/catalog/categories");
      if (!response.ok) throw new Error("Failed to load categories");

      const data = (await response.json()) as Category[];
      cache = data;
      subscribers.forEach((notify) => notify(data));
      return data;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // No early return for a warm cache: useState is already seeded from
    // it above, so writing the same value here would just be a
    // setState-in-effect that triggers an extra render. loadCategories()
    // resolves immediately from cache anyway.
    const notify = (next: Category[]) => {
      if (active) setCategories(next);
    };
    subscribers.add(notify);

    loadCategories()
      .then((data) => {
        if (!active) return;
        setCategories(data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load categories"
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      subscribers.delete(notify);
    };
  }, []);

  return { categories, loading, error };
};
