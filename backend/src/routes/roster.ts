import { Router } from "express";
import pool from "../db";
const router = Router();

router.get("/today", async (_req, res) => {
  const q = `
  WITH
    today AS (
      SELECT (NOW() AT TIME ZONE 'Australia/Sydney')::date AS d
    ),
    yesterday AS (
      SELECT (NOW() AT TIME ZONE 'Australia/Sydney' - INTERVAL '1 day')::date AS d
    )
  SELECT
    to_char((NOW() AT TIME ZONE 'Australia/Sydney'), 'YYYY-MM-DD"T"HH24:MI:SS"+11:00"') AS updated_at,
    r.date,
    s.id   AS shop_id,
    s.name AS shop_name,
    g.id   AS girl_id,
    g.name AS girl_name,
    g.origin,
    g.profile_url,
    g.photo_url,
    r.shift_text,
    COALESCE(v.count, 0) AS views,
    g.cached_replies_count AS replies_count,
    g.cached_avg_rating AS avg_rating
  FROM roster_entries r
  JOIN girls g ON g.id = r.girl_id
  JOIN shops s ON s.id = r.shop_id
  LEFT JOIN girl_views v ON v.girl_id = g.id
  WHERE (
    r.date = (SELECT d FROM today)
    OR (
      r.date = (SELECT d FROM yesterday)
      AND NOT EXISTS (
        SELECT 1 FROM roster_entries r2
        WHERE r2.shop_id = r.shop_id
          AND r2.girl_id = r.girl_id
          AND r2.date = (SELECT d FROM today)
      )
    )
  )
  ORDER BY s.name, COALESCE(g.name, '') ASC;
  `;

  try {
    const { rows } = await pool.query(q);

    // ✅ normalize Postgres dates to Sydney yyyy-mm-dd
    function normalizeDate(d: any) {
      return new Date(d).toLocaleDateString("en-CA", {
        timeZone: "Australia/Sydney",
      });
    }

    const todayDate = new Date().toLocaleDateString("en-CA", {
      timeZone: "Australia/Sydney",
    });

    const normalized = rows.map((r) => ({
      ...r,
      normDate: normalizeDate(r.date),
    }));

    const hasToday = normalized.some((r) => r.normDate === todayDate);
    const filteredRows = hasToday
      ? normalized.filter((r) => r.normDate === todayDate)
      : normalized;

    console.log("✅ todayDate:", todayDate);
    console.log(
      "✅ dates in payload:",
      [...new Set(normalized.map((r) => r.normDate))].join(", ")
    );
    console.log("✅ filtered count:", filteredRows.length);

    const grouped = new Map<number, { id: number; name: string; girls: any[] }>();
    const date = hasToday ? todayDate : normalized[0]?.normDate ?? null;
    const updatedAt = normalized[0]?.updated_at ?? null;

    for (const row of filteredRows) {
      if (!grouped.has(row.shop_id)) {
        grouped.set(row.shop_id, { id: row.shop_id, name: row.shop_name, girls: [] });
      }
      grouped.get(row.shop_id)!.girls.push({
        id: row.girl_id,
        name: row.girl_name,
        origin: row.origin,
        shift: row.shift_text || "",
        profileUrl: row.profile_url,
        photoUrl: row.photo_url,
        views: Number(row.views) || 0,
        repliesCount: Number(row.replies_count) || 0,
        avgRating: row.avg_rating !== null ? Number(row.avg_rating) : null,
      });
    }

    res.json({
      date,
      updatedAt,
      shops: Array.from(grouped.values()),
    });
  } catch (err) {
    console.error("Error fetching roster", err);
    res.status(500).json({ error: "Failed to fetch roster" });
  }
});

export default router;
