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
    const result = await pool.query(`
      SELECT 
        r.id,
        r.title,
        r.category,
        r.created_at,
        r.pinned,
        r.heat,
        r.girl_id,
        COALESCE(MAX(gv.count), 0) AS views,
        COUNT(re.id) AS replies_count
      FROM roasts r
      LEFT JOIN girl_views gv ON gv.girl_id = r.girl_id
      LEFT JOIN replies re ON re.roast_id = r.id
      GROUP BY r.id
      ORDER BY r.pinned DESC, r.created_at DESC;
    `);

    // optional: decay heat (you already had this)
    const roasts = await Promise.all(
  result.rows.map(async (row) => {
    const decayedHeat = applyHeatDecay(row);
    // fallback to 0 if NaN or not finite
    const safeHeat = Number.isFinite(decayedHeat) ? decayedHeat : 0;

    if (safeHeat !== row.heat) {
      const update = await pool.query(
        "UPDATE roasts SET heat=$1, last_decay=NOW() WHERE id=$2 RETURNING heat",
        [safeHeat, row.id]
      );
      return { ...row, heat: update.rows[0].heat };
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




router.post("/:id/view", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `INSERT INTO roast_views (roast_id, count)
       VALUES ($1, 1)
       ON CONFLICT (roast_id)
       DO UPDATE SET count = roast_views.count + 1
       RETURNING count`,
      [id]
    );
    res.json({ views: result.rows[0].count });
  } catch (err) {
    console.error("Error incrementing roast views:", err);
    res.status(500).json({ error: "Failed to update views" });
  }
});

/* -------------------------------------------------------------------------- */
/* Add heat (upvote)                                                          */
/* -------------------------------------------------------------------------- */
// backend/src/routes/roasts.ts
router.post("/:id/heat", async (req, res) => {
  const { id } = req.params;
  if (isNaN(Number(id))) return res.status(400).json({ error: "Invalid roast ID" });

  try {
    const result = await pool.query(
      `UPDATE roasts
       SET heat = heat + 1, last_decay = NOW()
       WHERE id = $1
       RETURNING id, title, category, created_at, heat, girl_id`,
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Roast not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error adding heat to roast:", err);
    res.status(500).json({ error: "Failed to add heat" });
  }
});

// NEW: Get replies by girl_id (used by GirlModal)
router.get("/girl/:girlId/replies", async (req, res) => {
  const { girlId } = req.params;
  try {
    const rRes = await pool.query("SELECT id FROM roasts WHERE girl_id = $1", [girlId]);
    if (rRes.rows.length === 0) {
      return res.json({ replies: [], repliesCount: 0, avgRating: 0 });
    }

    const roastId = rRes.rows[0].id;
    const repliesRes = await pool.query(
      `SELECT id, roast_id, parent_id, user_mask, reply AS comment, rating, heat, last_decay, created_at
         FROM replies WHERE roast_id = $1 ORDER BY created_at ASC`,
      [roastId]
    );

    const aggRes = await pool.query(
      `SELECT COUNT(*)::int AS count,
              COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg
         FROM replies WHERE roast_id = $1`,
      [roastId]
    );

    res.json({
      replies: repliesRes.rows,
      repliesCount: aggRes.rows[0].count,
      avgRating: parseFloat(aggRes.rows[0].avg) || 0,
    });
  } catch (err) {
    console.error("Error fetching girl replies:", err);
    res.status(500).json({ error: "Failed to fetch girl replies" });
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
/* Post reply / rating (auto-create roast for girl, ensure single roast)      */
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

    // 1️⃣ check if it's a roast id directly
    const roastCheck = await pool.query("SELECT * FROM roasts WHERE id = $1", [id]);
    if (roastCheck.rows.length) {
      roastId = Number(id);
    } else {
      // 2️⃣ check if a roast already exists for this girl
      const existing = await pool.query(
        "SELECT id FROM roasts WHERE girl_id = $1 LIMIT 1",
        [id]
      );

      if (existing.rows.length > 0) {
        roastId = existing.rows[0].id;
      } else {
        // 3️⃣ if not, create new one
        const gRes = await pool.query(
          `SELECT g.name AS girl_name, s.name AS shop_name
           FROM girls g
           LEFT JOIN shops s ON g.shop_id = s.id
           WHERE g.id = $1`,
          [id]
        );

        if (!gRes.rows.length)
          return res.status(404).json({ error: "Girl not found" });

        const girlName = gRes.rows[0].girl_name || "Unknown";
        const shopName = gRes.rows[0].shop_name || "";
        const title = shopName ? `${girlName} - ${shopName}` : girlName;

        const newR = await pool.query(
          `INSERT INTO roasts (title, category, girl_id)
           VALUES ($1, 'girl', $2)
           RETURNING id`,
          [title, id]
        );
        roastId = newR.rows[0].id;
      }
    }

    // 4️⃣ insert the actual reply
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
    const { rows: roastRows } = await pool.query(
  `SELECT id, title, category, COALESCE(created_at, NOW()) AS created_at,
          COALESCE(category, 'general') AS category,
          heat, girl_id
     FROM roasts
    WHERE id = $1`,
  [roastId]
);

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
