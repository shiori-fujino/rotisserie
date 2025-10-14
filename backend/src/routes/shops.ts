import { Router } from "express";
import pool from "../db";

const router = Router();

// GET /api/shops → list all shops + today’s girl count
router.get("/", async (_req, res) => {
  try {
    const q = `
      SELECT s.id,
             s.name,
             s.slug,
             s.address,
             s.lat,
             s.lng,
             COUNT(r.id) AS girls_today
      FROM shops s
      LEFT JOIN roster_entries r
        ON r.shop_id = s.id
       AND r.date = CURRENT_DATE
      GROUP BY s.id
      ORDER BY s.name;
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch shops" });
  }
});

// GET /api/shops/:slug → single shop (for ShopPage)
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const q = `SELECT * FROM shops WHERE slug = $1`;
    const { rows } = await pool.query(q, [slug]);
    if (!rows.length) return res.status(404).json({ error: "Shop not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch shop" });
  }
});

export default router;
