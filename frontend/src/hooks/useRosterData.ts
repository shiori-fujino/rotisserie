//frontend/srv/hooks/useRosterData.ts

import { useEffect, useState } from "react";
import type { RosterItem } from "../types";

export default function useRosterData() {
  const [data, setData] = useState<RosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/roster/today`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        // flatten shops → roster items
        const items: RosterItem[] = [];
        for (const shop of json.shops) {
          for (const g of shop.girls) {
            items.push({
              id: g.id,
              name: g.name,
              origin: g.origin,
              shop: shop.name,
              profileUrl: g.profileUrl,
              photo: g.photoUrl,
              views: g.views,
              reviewsCount: g.reviewsCount,
              commentsCount: g.commentsCount,
            });
          }
        }

        if (!ignore) {
          setData(items);
          setError(null);
        }
      } catch (err: any) {
        if (!ignore) setError(err.message || "Failed to load data");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchData();
    return () => {
      ignore = true;
    };
  }, []);

  return { data, setData, loading, error };
}
