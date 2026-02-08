"use client";

import { useEffect, useCallback } from "react";

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  meta: boolean = true
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (meta && (e.metaKey || e.ctrlKey) && e.key === key) {
        e.preventDefault();
        callback();
      } else if (!meta && e.key === key) {
        e.preventDefault();
        callback();
      }
    },
    [key, callback, meta]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
