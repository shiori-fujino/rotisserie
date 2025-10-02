// src/routes/threads.ts
import { Router } from "express";
import pool from "../db"; // adjust if your db connection file is named differently

const router = Router();

// Create new thread
// Create new thread (safe but not too strict)
router.post("/", async (req, res) => {
  const { title, category } = req.body;

  // Simple validation
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

// Get all threads
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM threads ORDER BY pinned DESC, created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching threads:", err);
    res.status(500).json({ error: "Failed to fetch threads" });
  }
});
// Add heat (upvote) to a thread
router.post("/:id/heat", async (req, res) => {
  const { id } = req.params;

  if (isNaN(Number(id))) {
    return res.status(400).json({ error: "Invalid thread ID" });
  }

  try {
    const result = await pool.query(
  `UPDATE threads
   SET heat = heat + 1
   WHERE id = $1
   RETURNING id, title, category, created_at, pinned, heat, last_decay`,
  [id]
);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error adding heat to thread:", err);
    res.status(500).json({ error: "Failed to add heat" });
  }
});
function applyHeatDecay(row: any, halfLifeHours = 24) {
  const now = new Date();
  const lastDecay = new Date(row.last_decay);
  const hoursPassed = (now.getTime() - lastDecay.getTime()) / (1000 * 60 * 60);

  if (hoursPassed <= 0) return row.heat;

  // simple exponential decay
  const decayFactor = Math.pow(0.5, hoursPassed / halfLifeHours);
  const newHeat = Math.floor(row.heat * decayFactor);

  return newHeat;
}
// Get all threads with decay applied
router.get("/", async (req, res) => {
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
// Add heat (with decay) to a thread
router.post("/:id/heat", async (req, res) => {
  const { id } = req.params;

  if (isNaN(Number(id))) {
    return res.status(400).json({ error: "Invalid thread ID" });
  }

  try {
    // fetch current
    const current = await pool.query("SELECT * FROM threads WHERE id = $1", [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: "Thread not found" });
    }
    let thread = current.rows[0];

    // apply decay first
    const decayedHeat = applyHeatDecay(thread);

    if (decayedHeat !== thread.heat) {
      const update = await pool.query(
        "UPDATE threads SET heat = $1, last_decay = NOW() WHERE id = $2 RETURNING *",
        [decayedHeat, id]
      );
      thread = update.rows[0];
    }

    // now +1 heat
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


export default router;
