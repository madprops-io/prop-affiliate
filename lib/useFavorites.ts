"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "madprops:favorites";

function safeParse(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === "string");
    return [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  const persist = useCallback((next: string[]) => {
    setFavorites(next);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
    } catch {
      // ignore write errors (private mode, etc.)
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = safeParse(window.localStorage.getItem(STORAGE_KEY));
      if (stored.length > 0) setFavorites(stored);
    } catch {
      // ignore read errors
    }
  }, []);

  const toggleFavorite = useCallback(
    (key: string) => {
      if (!key) return;
      setFavorites((prev) => {
        const exists = prev.includes(key);
        const next = exists ? prev.filter((item) => item !== key) : [...prev, key];
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          }
        } catch {
          // ignore write errors
        }
        return next;
      });
    },
    []
  );

  const isFavorite = useCallback(
    (key: string | null | undefined) => {
      if (!key) return false;
      return favorites.includes(key);
    },
    [favorites]
  );

  const clearFavorites = useCallback(() => {
    persist([]);
  }, [persist]);

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    clearFavorites,
  };
}
