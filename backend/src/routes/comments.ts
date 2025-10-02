// src/routes/comments.ts
import { Router } from "express";
import pool from "../db";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth";

const router = Router();

/* -------------------------------------------------------------------------- */
/* Zod schema for validation                                                  */
/* -------------------------------------------------------------------------- */
const commentSchema = z.object({
  rating: z.number().int().min(1).max(5).nullable().optional(),
  comment: z.string().trim().min(1).max(1000).nullable().optional(),
  parent_id: z.number().int().nullable().optional(),
});
function applyHeatDecay(row: any, halfLifeHours = 24) {
  const now = new Date();
  const lastDecay = new Date(row.last_decay);
  const hoursPassed = (now.getTime() - lastDecay.getTime()) / (1000 * 60 * 60);

  if (hoursPassed <= 0) return row.heat;

  const decayFactor = Math.pow(0.5, hoursPassed / halfLifeHours);
  const newHeat = Math.floor(row.heat * decayFactor);

  return newHeat;
}

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
router.post("/:girlId", async (req, res) => {  try {
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const { girlId } = req.params;
    const { rating, comment, parent_id } = parsed.data;

    const result = await pool.query(
      `INSERT INTO girl_comments (girl_id, rating, comment, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, girl_id, rating, comment, parent_id, created_at`,
      [girlId, rating ?? null, comment ?? null, parent_id ?? null]
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
router.put("/:id", requireAdmin, async (req, res) => {  try {
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const { id } = req.params;
    const { comment, rating } = parsed.data;

    const result = await pool.query(
      `UPDATE girl_comments
       SET comment = $1, rating = $2
       WHERE id = $3
       RETURNING id, girl_id, rating, comment, parent_id, created_at`,
      [comment ?? null, rating ?? null, id]
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
router.delete("/:id", requireAdmin, async (req, res) => {  try {
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
// Get comments for a thread
router.get("/thread/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM girl_comments WHERE thread_id = $1 ORDER BY created_at ASC",
      [id]
    );
    const decayed = await Promise.all(
  result.rows.map(async (row) => {
    const decayedHeat = applyHeatDecay(row);
    if (decayedHeat !== row.heat) {
      const update = await pool.query(
        "UPDATE girl_comments SET heat = $1, last_decay = NOW() WHERE id = $2 RETURNING *",
        [decayedHeat, row.id]
      );
      return update.rows[0];
    }
    return row;
  })
);

res.json(decayed);

  } catch (err) {
    console.error("Error fetching thread comments:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});
// Add a comment to a thread
router.post("/", async (req, res) => {
  const { text, thread_id, parent_id, user_mask } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO girl_comments (comment, thread_id, parent_id, user_mask)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [text, thread_id || null, parent_id || null, user_mask || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error posting comment:", err);
    res.status(500).json({ error: "Failed to post comment" });
  }
});
// Add heat (upvote) to a comment
router.post("/:id/heat", async (req, res) => {
  const { id } = req.params;

  if (isNaN(Number(id))) {
    return res.status(400).json({ error: "Invalid comment ID" });
  }

  try {
    // Step 1: fetch the comment
    const current = await pool.query(
      "SELECT * FROM girl_comments WHERE id = $1",
      [id]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }

    let comment = current.rows[0];

    // Step 2: apply decay
    const decayedHeat = applyHeatDecay(comment);

    if (decayedHeat !== comment.heat) {
      const update = await pool.query(
        "UPDATE girl_comments SET heat = $1, last_decay = NOW() WHERE id = $2 RETURNING *",
        [decayedHeat, id]
      );
      comment = update.rows[0];
    }

    // Step 3: now add +1 heat
    const result = await pool.query(
  `UPDATE girl_comments
   SET heat = heat + 1
   WHERE id = $1
   RETURNING id, girl_id, thread_id, rating, comment, parent_id, user_mask, heat, last_decay, created_at`,
  [id]
);

res.json(result.rows[0]);

  } catch (err) {
    console.error("Error adding heat to comment:", err);
    res.status(500).json({ error: "Failed to add heat" });
  }
});


export default router;
