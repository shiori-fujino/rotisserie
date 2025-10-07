//replies.ts

import { Router } from "express";
import pool from "../db";

const router = Router();

// GET all replies (for Admin feed)
router.get("/all", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT replies.*, roasts.title AS roast_title
      FROM replies
      LEFT JOIN roasts ON replies.roast_id = roasts.id
      ORDER BY replies.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching all replies:", err);
    res.status(500).json({ error: "Failed to fetch replies" });
  }
});

export default router;
