import { Router } from "express";
import pool from "../db";

const router = Router();

// GET /api/girls — list all girls w/ shop + stats
router.get("/", async (_req, res) => {
  try {
    const q = `
      SELECT
        g.id,
        g.name,
        g.origin,
        s.name AS shop_name,
        s.slug AS shop_slug,
        MAX(r.date) AS last_seen,
        ROUND(AVG(gc.rating), 1) AS avg_rating,
        COUNT(gv.girl_id) AS views
      FROM girls g
      LEFT JOIN shops s ON g.shop_id = s.id
      LEFT JOIN roster_entries r ON r.girl_id = g.id
      LEFT JOIN girl_comments gc ON gc.girl_id = g.id
      LEFT JOIN girl_views gv ON gv.girl_id = g.id
      GROUP BY g.id, s.name, s.slug
      ORDER BY g.name ASC;
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
