// backend/src/routes/roasts.ts
import { Router } from "express";
import pool from "../db";

const router = Router();

/* -------------------------------------------------------------------------- */
/* Helper: heat decay                                                         */
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
/* Create a new roast (manual post, not girlmodal)                            */
/* -------------------------------------------------------------------------- */
router.post("/", async (req, res) => {
  const { title, category } = req.body;
  if (!title || typeof title !== "string" || title.trim().length < 3)
    return res.status(400).json({ error: "Roast title must be at least 3 characters" });

  const safeCategory = category && typeof category === "string" ? category : "general";

  try {
    const result = await pool.query(
      `INSERT INTO roasts (title, category)
       VALUES ($1, $2)
       RETURNING id, title, category, created_at, pinned, heat`,
      [title.trim(), safeCategory]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating roast:", err);
    res.status(500).json({ error: "Failed to create roast" });
  }
});

/* -------------------------------------------------------------------------- */
/* Get all roasts (with decay applied)                                        */
/* -------------------------------------------------------------------------- */
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM roasts ORDER BY pinned DESC, created_at DESC");

    const roasts = await Promise.all(
      result.rows.map(async (row) => {
        const decayedHeat = applyHeatDecay(row);
        if (decayedHeat !== row.heat) {
          const update = await pool.query(
            "UPDATE roasts SET heat = $1, last_decay = NOW() WHERE id = $2 RETURNING *",
            [decayedHeat, row.id]
          );
          return update.rows[0];
        }
        return row;
      })
    );

    res.json(roasts);
  } catch (err) {
    console.error("Error fetching roasts:", err);
    res.status(500).json({ error: "Failed to fetch roasts" });
  }
});

/* -------------------------------------------------------------------------- */
/* Add heat (upvote)                                                          */
/* -------------------------------------------------------------------------- */
router.post("/:id/heat", async (req, res) => {
  const { id } = req.params;
  if (isNaN(Number(id))) return res.status(400).json({ error: "Invalid roast ID" });

  try {
    const current = await pool.query("SELECT * FROM roasts WHERE id = $1", [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: "Roast not found" });

    let roast = current.rows[0];
    const decayedHeat = applyHeatDecay(roast);
    if (decayedHeat !== roast.heat) {
      const update = await pool.query(
        "UPDATE roasts SET heat = $1, last_decay = NOW() WHERE id = $2 RETURNING *",
        [decayedHeat, id]
      );
      roast = update.rows[0];
    }

    const result = await pool.query(
      "UPDATE roasts SET heat = heat + 1 WHERE id = $1 RETURNING id, title, heat, last_decay",
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error adding heat to roast:", err);
    res.status(500).json({ error: "Failed to add heat" });
  }
});

/* -------------------------------------------------------------------------- */
/* Get replies (now by roast_id, not girl_id)                                 */
/* -------------------------------------------------------------------------- */
router.get("/:id/replies", async (req, res) => {
  const roastId = Number(req.params.id);
  if (isNaN(roastId)) return res.status(400).json({ error: "Invalid roast id" });

  try {
    const repliesRes = await pool.query(
      `SELECT id, roast_id, parent_id, user_mask,
              reply AS comment, rating, heat, last_decay, created_at
         FROM replies
        WHERE roast_id = $1
        ORDER BY created_at ASC`,
      [roastId]
    );

    const aggRes = await pool.query(
      `SELECT COUNT(*)::int AS count,
              COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg
         FROM replies
        WHERE roast_id = $1`,
      [roastId]
    );

    res.json({
      replies: repliesRes.rows,
      repliesCount: aggRes.rows[0].count,
      avgRating: parseFloat(aggRes.rows[0].avg) || 0,
    });
  } catch (err) {
    console.error("Error fetching replies:", err);
    res.status(500).json({ error: "Failed to fetch replies" });
  }
});

/* -------------------------------------------------------------------------- */
/* Post reply / rating (auto-create roast for girl)                           */
/* -------------------------------------------------------------------------- */
router.post("/:id/replies", async (req, res) => {
  const { id } = req.params; // could be girlId or roastId
  const { rating, comment, text, parent_id } = req.body;
  const safeText = comment ?? text ?? "";
  const cleanedReply = typeof safeText === "string" ? safeText.trim() : "";
  const anonId = (req as any).anonId;

  if (!cleanedReply && (rating == null || isNaN(Number(rating))))
    return res.status(400).json({ error: "Must provide rating or reply text" });

  try {
    let roastId: number;
    // try interpret as roast id first
    const roastCheck = await pool.query("SELECT * FROM roasts WHERE id = $1", [id]);
    if (roastCheck.rows.length) {
      roastId = Number(id);
    } else {
      // fallback to girl id (auto-create)
      const gRes = await pool.query("SELECT name FROM girls WHERE id = $1", [id]);
      if (!gRes.rows.length) return res.status(404).json({ error: "Girl not found" });
      const girlName = gRes.rows[0].name || "Unknown";

      const newR = await pool.query(
        `INSERT INTO roasts (title, category, girl_id)
         VALUES ($1, 'girl', $2)
         RETURNING id`,
        [girlName, id]
      );
      roastId = newR.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO replies (roast_id, reply, user_mask, parent_id, rating)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [roastId, cleanedReply || null, anonId, parent_id || null, rating]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error posting reply:", err);
    res.status(500).json({ error: "Failed to post reply" });
  }
});

/* -------------------------------------------------------------------------- */
/* Get single roast (for RoastView)                                           */
/* -------------------------------------------------------------------------- */
router.get("/:id", async (req, res) => {
  const roastId = Number(req.params.id);
  if (isNaN(roastId)) return res.status(400).json({ error: "Invalid roast id" });

  try {
    const { rows: roastRows } = await pool.query("SELECT * FROM roasts WHERE id = $1", [roastId]);
    if (!roastRows.length) return res.status(404).json({ error: "Roast not found" });
    const roast = roastRows[0];

    const { rows: replies } = await pool.query(
      `SELECT r.*, COALESCE(rating, 0) AS rating
         FROM replies r
        WHERE roast_id = $1
        ORDER BY created_at ASC`,
      [roastId]
    );

    const avgRating =
      replies.length > 0
        ? replies.filter(r => r.rating).reduce((a, b) => a + Number(b.rating || 0), 0) /
          replies.filter(r => r.rating).length
        : 0;

    res.json({
      roast,
      replies,
      repliesCount: replies.length,
      avgRating,
    });
  } catch (err) {
    console.error("Error fetching roast:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
