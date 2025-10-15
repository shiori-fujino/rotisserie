//roster.ts

import { Router } from "express";
import pool from "../db";

const router = Router();

const ORIGIN_MAP: Record<string, string> = {
  J: "Japanese", JP: "Japanese", JAPANESE: "Japanese",
  K: "Korean", KR: "Korean", KOREAN: "Korean",
  C: "Chinese", CN: "Chinese", CHINESE: "Chinese",
  TW: "Taiwanese", TAIWANESE: "Taiwanese",
  V: "Vietnamese", VIET: "Vietnamese", VIETNAMESE: "Vietnamese",
  T: "Thai", TH: "Thai", THAI: "Thai",
  AU: "Australian", AUSSIE: "Australian", AUSTRALIAN: "Australian",
};
function normalizeOrigin(raw: string | null): string | null {
  if (!raw) return null;
  const key = raw.trim().toUpperCase();
  return ORIGIN_MAP[key] || "Other";
}

router.get("/today", async (_req, res) => {
  const q = `
  WITH today AS (SELECT (NOW() AT TIME ZONE 'Australia/Sydney')::date AS d)
  SELECT
    (SELECT d FROM today) AS date,
    s.id   AS shop_id,
    s.name AS shop_name,
    g.id   AS girl_id,
    g.name AS girl_name,
    g.origin,
    g.profile_url,
    g.photo_url,
    r.shift_text,
    COALESCE(v.count, 0) AS views,

    -- ✅ replies = text-only; avg rating computed in DB
    COALESCE(c.replies_count, 0) AS replies_count,
    c.avg_rating AS avg_rating

  FROM roster_entries r
  JOIN girls g ON g.id = r.girl_id
  JOIN shops s ON s.id = r.shop_id
  LEFT JOIN girl_views v ON v.girl_id = g.id
  LEFT JOIN (
  SELECT
    r.girl_id,
    COUNT(rep.id) AS replies_count,
    ROUND(AVG(rep.rating)::numeric, 1) AS avg_rating
  FROM roasts r
  LEFT JOIN replies rep ON rep.roast_id = r.id
  GROUP BY r.girl_id
) c ON c.girl_id = g.id
  WHERE r.date = (SELECT d FROM today)
  ORDER BY s.name, COALESCE(g.name, '') ASC;
  `;

  try {
    const { rows } = await pool.query(q);

    const grouped = new Map<number, { id: number; name: string; girls: any[] }>();
    const date = rows[0]?.date ?? null;

    for (const row of rows) {
      if (!grouped.has(row.shop_id)) {
        grouped.set(row.shop_id, { id: row.shop_id, name: row.shop_name, girls: [] });
      }
      grouped.get(row.shop_id)!.girls.push({
        id: row.girl_id,
        name: row.girl_name,
        origin: normalizeOrigin(row.origin),
        shift: row.shift_text || "",
        profileUrl: row.profile_url,
        photoUrl: row.photo_url,
        views: Number(row.views) || 0,
        repliesCount: Number(row.replies_count) || 0,
        avgRating: row.avg_rating !== null ? Number(row.avg_rating) : null,
      });
    }

    res.json({ date, shops: Array.from(grouped.values()) });
  } catch (err) {
    console.error("Error fetching roster", err);
    res.status(500).json({ error: "Failed to fetch roster" });
  }
});

export default router;
