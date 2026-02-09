import { create } from "zustand";
import { Product } from "@/types";

interface SearchState {
  isOpen: boolean;
  query: string;
  results: Product[];
  isLoading: boolean;
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
  isLoading: false,
  open: () => set({ isOpen: true }),
  close: () => {
    if (activeController) activeController.abort();
    if (searchTimeout) clearTimeout(searchTimeout);
    set({ isOpen: false, query: "", results: [], isLoading: false });
  },
  setQuery: (query) => {
    set({ query, isLoading: query.length >= 1 });

    if (searchTimeout) clearTimeout(searchTimeout);
    if (activeController) activeController.abort();

    if (query.length < 1) {
      set({ results: [], isLoading: false });
      return;
    }

    // Debounce search - wait 400ms for user to finish typing
    searchTimeout = setTimeout(async () => {
      const controller = new AbortController();
      activeController = controller;
      try {
        const response = await fetch(
          `/api/catalog/search?q=${encodeURIComponent(query)}`,
          { 
            signal: controller.signal,
            headers: { "Cache-Control": "no-cache" }
          }
        );
        if (!response.ok) throw new Error("Search failed");
        const data = (await response.json()) as Product[];
        set({ results: data, isLoading: false });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        set({ results: [], isLoading: false });
      }
    }, 400);
  },
  reset: () => set({ query: "", results: [], isLoading: false }),
}));
