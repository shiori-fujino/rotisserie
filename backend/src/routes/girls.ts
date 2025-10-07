// backend/src/routes/girls.ts
import { Router } from "express";
import pool from "../db";

const router = Router();

// get girl by id
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
