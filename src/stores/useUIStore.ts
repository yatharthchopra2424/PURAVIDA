import { create } from "zustand";

interface UIState {
  activeMegaMenuCategory: string | null;
  isMobileNavOpen: boolean;
  setActiveCategory: (category: string | null) => void;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeMegaMenuCategory: null,
  isMobileNavOpen: false,
  setActiveCategory: (category) => set({ activeMegaMenuCategory: category }),
  toggleMobileNav: () =>
    set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen })),
  closeMobileNav: () => set({ isMobileNavOpen: false }),
}));
