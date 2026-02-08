import { create } from "zustand";
import { Product } from "@/types";

interface SearchState {
  isOpen: boolean;
  query: string;
  results: Product[];
  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  reset: () => void;
}

let activeController: AbortController | null = null;
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

export const useSearchStore = create<SearchState>((set) => ({
  isOpen: false,
  query: "",
  results: [],
  open: () => set({ isOpen: true }),
  close: () => {
    if (activeController) activeController.abort();
    if (searchTimeout) clearTimeout(searchTimeout);
    set({ isOpen: false, query: "", results: [] });
  },
  setQuery: (query) => {
    set({ query });

    if (searchTimeout) clearTimeout(searchTimeout);
    if (activeController) activeController.abort();

    if (query.length < 2) {
      set({ results: [] });
      return;
    }

    searchTimeout = setTimeout(async () => {
      const controller = new AbortController();
      activeController = controller;
      try {
        const response = await fetch(
          `/api/catalog/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("Search failed");
        const data = (await response.json()) as Product[];
        set({ results: data });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        set({ results: [] });
      }
    }, 200);
  },
  reset: () => set({ query: "", results: [] }),
}));
