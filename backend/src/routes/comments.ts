// src/routes/comments.ts
import { Router } from "express";
import pool from "../db";

const router = Router();

/* -------------------------------------------------------------------------- */
/* GET comments for a girl (with replies)                                     */
/* -------------------------------------------------------------------------- */
router.get("/:girlId", async (req, res) => {
  try {
    const { girlId } = req.params;
    const result = await pool.query(
      `SELECT id, rating, comment, created_at, parent_id
       FROM girl_comments
       WHERE girl_id = $1
       ORDER BY created_at ASC`,
      [girlId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("fetch comments error", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------------------------------------------------------------- */
/* POST new comment or reply                                                  */
/* -------------------------------------------------------------------------- */
router.post("/:girlId", async (req, res) => {
  try {
    const { girlId } = req.params;
    const { rating, comment, parent_id } = req.body;

    const result = await pool.query(
      `INSERT INTO girl_comments (girl_id, rating, comment, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, girl_id, rating, comment, parent_id, created_at`,
      [girlId, rating || null, comment || null, parent_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("add comment error", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------------------------------------------------------------- */
/* GET all comments (for feed/admin page)                                     */
/* -------------------------------------------------------------------------- */
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.girl_id, g.name AS girl_name, g.profile_url, g.photo_url,
             c.rating, c.comment, c.parent_id, c.created_at
      FROM girl_comments c
      JOIN girls g ON g.id = c.girl_id
      ORDER BY c.created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("fetch all comments error", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------------------------------------------------------------- */
/* UPDATE a comment (admin edit)                                              */
/* -------------------------------------------------------------------------- */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, rating } = req.body;

    const result = await pool.query(
      `UPDATE girl_comments
       SET comment = $1, rating = $2
       WHERE id = $3
       RETURNING id, girl_id, rating, comment, parent_id, created_at`,
      [comment || null, rating || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("update comment error", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------------------------------------------------------------- */
/* DELETE a comment (admin remove)                                            */
/* -------------------------------------------------------------------------- */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM girl_comments WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }

    res.json({ success: true, id });
  } catch (err) {
    console.error("delete comment error", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
