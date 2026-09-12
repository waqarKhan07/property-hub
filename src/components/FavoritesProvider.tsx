import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface FavoritesContextValue {
  favoriteIds: Set<string>;
  loaded: boolean;
  toggleFavorite: (propertyId: string) => Promise<boolean>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    if (!session || !user) {
      setFavoriteIds(new Set());
      setLoaded(true);
      return;
    }
    supabase
      .from("favorites")
      .select("property_id")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (!active) return;
        if (!error) {
          setFavoriteIds(new Set((data ?? []).map((f) => f.property_id as string)));
        }
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [session, user]);

  const load = useCallback(async () => {
    if (!session || !user) {
      setFavoriteIds(new Set());
      setLoaded(true);
      return;
    }
    const { data, error } = await supabase
      .from("favorites")
      .select("property_id")
      .eq("user_id", user.id);
    if (!error) {
      setFavoriteIds(new Set((data ?? []).map((f) => f.property_id as string)));
    }
    setLoaded(true);
  }, [session, user]);

  const toggleFavorite = useCallback(
    async (propertyId: string): Promise<boolean> => {
      if (!session || !user) return false;
      const uid = user.id;

      if (favoriteIds.has(propertyId)) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(propertyId);
          return next;
        });
        const { error } = await supabase.from("favorites").delete().eq("user_id", uid).eq("property_id", propertyId);
        return !error;
      } else {
        setFavoriteIds((prev) => new Set(prev).add(propertyId));
        const { error } = await supabase.from("favorites").insert({ user_id: uid, property_id: propertyId });
        if (error) {
          await load();
        }
        return !error;
      }
    },
    [session, user, favoriteIds, load],
  );

  const value = useMemo(
    () => ({ favoriteIds, loaded, toggleFavorite }),
    [favoriteIds, loaded, toggleFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within a FavoritesProvider");
  return ctx;
}