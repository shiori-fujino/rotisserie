import { useEffect, useState } from "react";
import type { RosterItem } from "../types";
import { API_BASE } from "../config";

export default function useRosterData() {
  const [data, setData] = useState<RosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      const res = await fetch(`${API_BASE}/api/roster/today`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

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
            shift: g.shift || "",
            views: g.views ?? 0,
            commentsCount: g.commentsCount ?? 0,
            avgRating: g.avgRating ?? 0,
          });
        }
      }
      setData(items);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(); // ✅ load only once
  }, []);

  return { data, loading, error, refetch: fetchData };
}
