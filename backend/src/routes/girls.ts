//girls.ts

import { Router } from "express";
import pool from "../db";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const q = `
      SELECT 
        g.id,
        g.name,
        g.origin,
        g.profile_url,
        s.name AS shop_name,
        s.slug AS shop_slug,
        r.last_seen,
        COALESCE(v.views, 0) AS views,
        COALESCE(rep.avg_rating, 0) AS avg_rating
      FROM girls g
      LEFT JOIN shops s ON s.id = g.shop_id

      -- 🕓 most recent roster date per girl
      LEFT JOIN (
        SELECT girl_id, MAX(date) AS last_seen
        FROM roster_entries
        GROUP BY girl_id
      ) r ON r.girl_id = g.id

      -- 👀 total views per girl
      LEFT JOIN (
        SELECT girl_id, SUM(count) AS views
        FROM girl_views
        GROUP BY girl_id
      ) v ON v.girl_id = g.id

      -- ⭐️ average rating per girl (via roasts → replies)
      LEFT JOIN (
        SELECT ro.girl_id,
               ROUND(AVG(rep.rating)::numeric, 1) AS avg_rating
        FROM roasts ro
        LEFT JOIN replies rep ON rep.roast_id = ro.id
        GROUP BY ro.girl_id
      ) rep ON rep.girl_id = g.id

      ORDER BY r.last_seen DESC NULLS LAST;
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching girls list:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/girls/:id — single girl by id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const result = await pool.query("SELECT * FROM girls WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Girl not found" });
    }
    res.json({
      ...result.rows[0],
      photo: result.rows[0].photo_url,
      views: result.rows[0].views || 0,
    });
  } catch (err) {
    console.error("Error fetching girl:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
