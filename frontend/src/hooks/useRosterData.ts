// hooks/useRosterData.ts
import { useEffect, useState } from "react";
import type { RosterItem } from "../types";
import { normalizeOrigin } from "../utils/normalize";

const API = "http://localhost:4000/api";

export default function useRosterData() {
  const [data, setData] = useState<RosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);

        const res = await fetch(`${API}/roster/today`, { cache: "no-store" });
        if (!res.ok) throw new Error(`/roster/today HTTP ${res.status}`);
        const json = await res.json();

        // ✅ keep girl_id from backend
        const flat: RosterItem[] = (json.shops || []).flatMap((shop: any) =>
          (shop.girls || []).map((g: any) => {
            const originCode = g.origin || "";
            return {
              id: g.id, // 👈 DB id comes from backend
              shop: shop.name || "",
              name: g.name || "",
              originCode,
              origin: normalizeOrigin(originCode),
              shift: g.shift || "",
              profile: g.profileUrl || "",
              photo: g.photoUrl || "",
              photos: undefined,
              views: g.views ?? 0,
              reviewsCount: g.reviewsCount ?? 0,
            } as RosterItem;
          })
        );

        if (!cancelled) {
          setData(flat);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? String(e));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
