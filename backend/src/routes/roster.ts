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

router.get("/today", async (req, res) => {
  const idsParam = (req.query.shop_ids as string | undefined) || "";
  const ids = idsParam.split(",").map(s => s.trim()).filter(Boolean).map(Number);

  const params: any[] = [];
  let filter = "";
  if (ids.length) {
    params.push(ids);
    filter = "AND s.id = ANY($1::int[])";
  }

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
    COALESCE(MAX(v.count), 0) AS views,
    COUNT(r2.id)::int AS comments_count
  FROM roster_entries r
JOIN girls g ON g.id = r.girl_id
JOIN shops s ON s.id = r.shop_id
LEFT JOIN girl_views v ON v.girl_id = g.id
LEFT JOIN girl_comments r2 ON r2.girl_id = g.id
WHERE r.date = (SELECT d FROM today)
GROUP BY s.id, s.name, g.id, g.name, g.origin, g.profile_url, g.photo_url, r.shift_text, v.count
ORDER BY s.name, COALESCE(g.name, '') ASC;
  `;
  const { rows } = await pool.query(q, params);

  const grouped = new Map<number, { id: number; name: string; girls: any[] }>();
  const date = rows[0]?.date ?? null;

  for (const row of rows) {
    if (!grouped.has(row.shop_id)) {
      grouped.set(row.shop_id, {
        id: row.shop_id,
        name: row.shop_name,
        girls: [],
      });
    }
    grouped.get(row.shop_id)!.girls.push({
      id: row.girl_id,
      name: row.girl_name,
      origin: normalizeOrigin(row.origin),
      shift: row.shift_text || "",
      profileUrl: row.profile_url,
      photoUrl: row.photo_url,
      views: row.views,
      commentsCount: row.comments_count,
    });
  }

  res.json({ date, shops: Array.from(grouped.values()) });
});

export default router;
