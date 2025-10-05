import { Router } from "express";
import pool from "../db";

const router = Router();

/* -------------------------------------------------------------------------- */
/* Heat decay helper                                                          */
/* -------------------------------------------------------------------------- */
function applyHeatDecay(row: any, halfLifeHours = 24) {
  const now = new Date();
  const lastDecay = new Date(row.last_decay);
  const hoursPassed = (now.getTime() - lastDecay.getTime()) / (1000 * 60 * 60);

  if (hoursPassed <= 0) return row.heat;

  const decayFactor = Math.pow(0.5, hoursPassed / halfLifeHours);
  return Math.floor(row.heat * decayFactor);
}

/* -------------------------------------------------------------------------- */
/* Create a new thread manually (not used by GirlModal usually)               */
/* -------------------------------------------------------------------------- */
router.post("/", async (req, res) => {
  const { title, category } = req.body;
  if (!title || typeof title !== "string" || title.trim().length < 3) {
    return res.status(400).json({ error: "Thread title must be at least 3 characters" });
  }
  const safeCategory = category && typeof category === "string" ? category : "general";

  try {
    const result = await pool.query(
      `INSERT INTO threads (title, category)
       VALUES ($1, $2)
       RETURNING id, title, category, created_at, pinned, heat`,
      [title.trim(), safeCategory]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating thread:", err);
    res.status(500).json({ error: "Failed to create thread" });
  }
});

/* -------------------------------------------------------------------------- */
/* Get all threads (with decay applied)                                       */
/* -------------------------------------------------------------------------- */
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM threads ORDER BY pinned DESC, created_at DESC"
    );

    const threads = await Promise.all(
      result.rows.map(async (row) => {
        const decayedHeat = applyHeatDecay(row);
        if (decayedHeat !== row.heat) {
          const update = await pool.query(
            "UPDATE threads SET heat = $1, last_decay = NOW() WHERE id = $2 RETURNING *",
            [decayedHeat, row.id]
          );
          return update.rows[0];
        }
        return row;
      })
    );

    res.json(threads);
  } catch (err) {
    console.error("Error fetching threads:", err);
    res.status(500).json({ error: "Failed to fetch threads" });
  }
});

/* -------------------------------------------------------------------------- */
/* Add heat (upvote) to a thread                                              */
/* -------------------------------------------------------------------------- */
router.post("/:id/heat", async (req, res) => {
  const { id } = req.params;
  if (isNaN(Number(id))) {
    return res.status(400).json({ error: "Invalid thread ID" });
  }

  try {
    const current = await pool.query("SELECT * FROM threads WHERE id = $1", [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: "Thread not found" });
    }
    let thread = current.rows[0];

    const decayedHeat = applyHeatDecay(thread);
    if (decayedHeat !== thread.heat) {
      const update = await pool.query(
        "UPDATE threads SET heat = $1, last_decay = NOW() WHERE id = $2 RETURNING *",
        [decayedHeat, id]
      );
      thread = update.rows[0];
    }

    const result = await pool.query(
      "UPDATE threads SET heat = heat + 1 WHERE id = $1 RETURNING id, title, heat, last_decay",
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error adding heat to thread:", err);
    res.status(500).json({ error: "Failed to add heat" });
  }
});

/* -------------------------------------------------------------------------- */
/* Get comments for a girl → now with avg + count                             */
/* -------------------------------------------------------------------------- */
router.get("/:id/comments", async (req, res) => {
  const { id } = req.params; // girlId
  try {
    const tRes = await pool.query("SELECT id FROM threads WHERE girl_id = $1", [id]);
    if (tRes.rows.length === 0) {
      return res.json({ comments: [], commentsCount: 0, avgRating: 0 });
    }
    const threadId = tRes.rows[0].id;

    const commentsRes = await pool.query(
      "SELECT * FROM comments WHERE thread_id = $1 ORDER BY created_at ASC",
      [threadId]
    );

    const aggRes = await pool.query(
      `SELECT COUNT(*)::int AS count,
              COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg
       FROM comments WHERE thread_id = $1`,
      [threadId]
    );

    res.json({
      comments: commentsRes.rows,
      commentsCount: aggRes.rows[0].count,
      avgRating: parseFloat(aggRes.rows[0].avg) || 0,
    });
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

/* -------------------------------------------------------------------------- */
/* Post a comment or rating for a girl → auto-create thread if missing        */
/* -------------------------------------------------------------------------- */
router.post("/:id/comments", async (req, res) => {
  const { id } = req.params; // girlId
  const { rating, comment, text, parent_id } = req.body;

  // ✅ safely handle nulls before trim
  const safeComment = comment ?? text ?? "";
  const cleanedComment = typeof safeComment === "string" ? safeComment.trim() : "";

  const anonId = (req as any).anonId;

  // ✅ must have at least a rating OR a non-empty comment
  if (!cleanedComment && (rating == null || isNaN(Number(rating)))) {
    return res.status(400).json({ error: "Must provide rating or comment" });
  }

  try {
    let threadId: number;
    const tRes = await pool.query("SELECT id FROM threads WHERE girl_id = $1", [id]);
    if (tRes.rows.length) {
      threadId = tRes.rows[0].id;
    } else {
      const gRes = await pool.query("SELECT name FROM girls WHERE id = $1", [id]);
      if (gRes.rows.length === 0) {
        return res.status(404).json({ error: "Girl not found" });
      }
      const girlName = gRes.rows[0].name || "Unknown";

      const newT = await pool.query(
        `INSERT INTO threads (title, category, girl_id)
         VALUES ($1, 'girl', $2)
         RETURNING id`,
        [girlName, id]
      );
      threadId = newT.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO comments (thread_id, comment, user_mask, parent_id, rating)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [threadId, cleanedComment || null, anonId, parent_id || null, rating]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error posting comment:", err);
    res.status(500).json({ error: "Failed to post comment" });
  }
});

export default router;
