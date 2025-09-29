// backend/src/routes/stats.ts
import { Router } from "express";
import pool from "../db";
import { DateTime } from "luxon";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    // Compute today in Sydney
    const todaySydney = DateTime.now()
      .setZone("Australia/Sydney")
      .toISODate(); // e.g. "2025-09-30"

    const q = {
      daysOnline: `
        SELECT ($1::date - MIN(date)) + 1 AS days_online
        FROM roster_entries
      `,
      visitsToday: `
        SELECT COALESCE(SUM(count), 0)::int AS visits_today
        FROM site_visits
        WHERE date = $1
      `,
      visitsTotal: `
        SELECT COALESCE(SUM(count), 0)::int AS visits_total
        FROM site_visits
      `,
      girlsToday: `
        SELECT COUNT(DISTINCT girl_id)::int AS girls_today
        FROM roster_entries
        WHERE date = $1
      `,
      girlsTotal: `SELECT COUNT(*)::int AS girls_total FROM girls`,
      commentsToday: `
        SELECT COUNT(*)::int AS comments_today
        FROM girl_comments
        WHERE (created_at AT TIME ZONE 'Australia/Sydney')::date = $1
      `,
      commentsTotal: `SELECT COUNT(*)::int AS comments_total FROM girl_comments`,
      viewsTotal: `SELECT COALESCE(SUM(count), 0)::int AS views_total FROM girl_views`,
    };

    const out: any = {};
    for (const [key, sql] of Object.entries(q)) {
      // only bind todaySydney where query uses $1
      if (sql.includes("$1")) {
        const { rows } = await pool.query(sql, [todaySydney]);
        out[key] = Object.values(rows[0])[0];
      } else {
        const { rows } = await pool.query(sql);
        out[key] = Object.values(rows[0])[0];
      }
    }

    res.json(out);
  } catch (err) {
    console.error("stats error", err);
    res.status(500).json({ error: "Could not fetch stats" });
  }
});

export default router;
