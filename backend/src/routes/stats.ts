import { Router } from "express";
import pool from "../db";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const q = {
      daysOnline: `
        SELECT (NOW()::date - MIN(date)) + 1 AS days_online
        FROM roster_entries
      `,
      visitsToday: `
        SELECT COALESCE(SUM(count), 0)::int AS visits_today
        FROM site_visits
        WHERE date = CURRENT_DATE
      `,
      visitsTotal: `
        SELECT COALESCE(SUM(count), 0)::int AS visits_total
        FROM site_visits
      `,
      girlsToday: `
        SELECT COUNT(DISTINCT girl_id)::int AS girls_today
        FROM roster_entries
        WHERE date = CURRENT_DATE
      `,
      girlsTotal: `SELECT COUNT(*)::int AS girls_total FROM girls`,
      commentsToday: `
        SELECT COUNT(*)::int AS comments_today
        FROM girl_comments
        WHERE created_at::date = CURRENT_DATE
      `,
      commentsTotal: `SELECT COUNT(*)::int AS comments_total FROM girl_comments`,
      viewsTotal: `SELECT COALESCE(SUM(count), 0)::int AS views_total FROM girl_views`,
    };

    const out: any = {};
    for (const [key, sql] of Object.entries(q)) {
      const { rows } = await pool.query(sql);
      out[key] = Object.values(rows[0])[0];
    }

    res.json(out);
  } catch (err) {
    console.error("stats error", err);
    res.status(500).json({ error: "Could not fetch stats" });
  }
});

export default router;
