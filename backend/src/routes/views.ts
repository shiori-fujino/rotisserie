// backend/src/routes/views.ts
import { Router } from "express";
import pool from "../db";

const router = Router();

// increment views for a girl
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

// get current view count
router.get("/:girlId", async (req, res) => {
  try {
    const { girlId } = req.params;
    const result = await pool.query(
      `SELECT count FROM girl_views WHERE girl_id = $1`,
      [girlId]
    );
    res.json({ views: result.rows[0]?.count || 0 });
  } catch (err) {
    console.error("Error fetching views", err);
    res.status(500).json({ error: "Failed to fetch views" });
  }
});

export default router;
