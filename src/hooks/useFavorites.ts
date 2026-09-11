import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export function useFavorites() {
  const { user, session } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!session) {
      setFavoriteIds(new Set());
      setLoaded(true);
      return;
    }
    const { data, error } = await supabase
      .from("favorites")
      .select("property_id")
      .eq("user_id", user?.id ?? "");
    if (!error) {
      setFavoriteIds(new Set((data ?? []).map((f) => f.property_id as string)));
    }
    setLoaded(true);
  }, [session, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFavorite = useCallback(
    async (propertyId: string): Promise<boolean> => {
      if (!session) return false;
      const uid = user?.id;
      if (!uid) return false;

      const isFav = favoriteIds.has(propertyId);
      if (isFav) {
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
    [session, user?.id, favoriteIds, load],
  );

  const value = useMemo(() => ({ favoriteIds, loaded, toggleFavorite }), [favoriteIds, loaded, toggleFavorite]);
  return value;
}