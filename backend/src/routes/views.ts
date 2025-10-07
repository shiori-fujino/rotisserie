// backend/src/routes/views.ts
import { Router } from "express";
import pool from "../db";

const router = Router();

/* -------------------------------------------------------------------------- */
/* Increment girl views                                                       */
/* -------------------------------------------------------------------------- */
router.post("/:girlId", async (req, res) => {
  try {
    const { girlId } = req.params;
    const result = await pool.query(
      `INSERT INTO girl_views (girl_id, count)
       VALUES ($1, 1)
       ON CONFLICT (girl_id) DO UPDATE
         SET count = girl_views.count + 1
       RETURNING count`,
      [girlId]
    );
    res.json({ views: result.rows[0].count });
  } catch (err) {
    console.error("Error incrementing views", err);
    res.status(500).json({ error: "Failed to increment views" });
  }
});

/* -------------------------------------------------------------------------- */
/* Get current girl stats: views + comments + avg rating                      */
/* -------------------------------------------------------------------------- */
router.get("/:girlId", async (req, res) => {
  try {
    const { girlId } = req.params;

    const result = await pool.query(
      `
      SELECT
        COALESCE(v.count, 0) AS views,
        COALESCE(c.comment_count, 0) AS comments,
        COALESCE(c.avg_rating, 0)::float AS avg_rating
      FROM (
        SELECT $1::int AS girl_id
      ) g
      LEFT JOIN girl_views v ON v.girl_id = g.girl_id
      LEFT JOIN (
        SELECT
          ro.girl_id,
          COUNT(r.id) AS comment_count,
          ROUND(AVG(r.rating)::numeric, 1) AS avg_rating
        FROM roasts ro
        JOIN replies r ON r.roast_id = ro.id
        WHERE ro.girl_id = $1
        GROUP BY ro.girl_id
      ) c ON c.girl_id = g.girl_id
      `,
      [girlId]
    );

    const stats = result.rows[0] || {
      views: 0,
      comments: 0,
      avg_rating: 0,
    };

    res.json(stats);
  } catch (err) {
    console.error("Error fetching girl stats:", err);
    res.status(500).json({ error: "Failed to fetch girl stats" });
  }
});

export default router;
