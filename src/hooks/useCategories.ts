"use client";

import { useEffect, useState } from "react";
import { Category } from "@/types";

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const response = await fetch("/api/catalog/categories");
        if (!response.ok) {
          throw new Error("Failed to load categories");
        }
        const data = (await response.json()) as Category[];
        if (isActive) {
          setCategories(data);
          setError(null);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : "Failed to load categories");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, []);

  return { categories, loading, error };
};
