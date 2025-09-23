import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import pool from "./db";
import commentsRouter from "./routes/comments";
import blogRoutes from "./routes/blog";
import contactRoutes from "./routes/contact";
import authRoutes from "./routes/auth";
import { requireAdmin } from "./middleware/auth";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());


app.use("/api/auth", authRoutes);

// Protect contact listing
app.get("/api/contact", requireAdmin, async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT id, message, created_at
    FROM contact_messages
    ORDER BY created_at DESC;
  `);
  res.json(rows);
});
/* -------------------------------------------------------------------------- */
/* ROUTES MOUNT                                                                */
/* -------------------------------------------------------------------------- */
app.use("/api/comments", commentsRouter);
app.use("/api/blog", blogRoutes);
app.use("/api/contact", contactRoutes); // ✅ contact form routes

/* -------------------------------------------------------------------------- */
/* ORIGIN NORMALIZER                                                           */
/* -------------------------------------------------------------------------- */
const ORIGIN_MAP: Record<string, string> = {
  // Japanese
  J: "Japanese",
  JP: "Japanese",
  JAPANESE: "Japanese",

  // Korean
  K: "Korean",
  KR: "Korean",
  KOREAN: "Korean",

  // Chinese
  C: "Chinese",
  CN: "Chinese",
  CHINESE: "Chinese",

  // Taiwanese
  TW: "Taiwanese",
  TAIWANESE: "Taiwanese",

  // Vietnamese
  V: "Vietnamese",
  VIET: "Vietnamese",
  VIETNAMESE: "Vietnamese",

  // Thai
  T: "Thai",
  TH: "Thai",
  THAI: "Thai",

  // Australian
  AU: "Australian",
  AUSSIE: "Australian",
  AUSTRALIAN: "Australian",
};

function normalizeOrigin(raw: string | null): string | null {
  if (!raw) return null;
  const key = raw.trim().toUpperCase();
  return ORIGIN_MAP[key] || "Other"; // catch-all fallback
}

/* -------------------------------------------------------------------------- */
/* ROUTES                                                                     */
/* -------------------------------------------------------------------------- */

// --- Health -----------------------------------------------------------------
app.get("/api/health", async (_req: Request, res: Response) => {
  const r = await pool.query(
    "SELECT (NOW() AT TIME ZONE 'Australia/Sydney')::date AS today"
  );
  res.json({ ok: true, today: r.rows[0].today });
});

// --- Shops ------------------------------------------------------------------
app.get("/api/shops", async (_req: Request, res: Response) => {
  const q = `
    SELECT id, name, canonical_url AS url
    FROM shops
    ORDER BY name;
  `;
  const { rows } = await pool.query(q);
  res.json(rows);
});

// --- Today’s roster ---------------------------------------------------------
app.get("/api/roster/today", async (req: Request, res: Response) => {
  const idsParam = (req.query.shop_ids as string | undefined) || "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n));

  const params: any[] = [];
  let filter = "";
  if (ids.length) {
    params.push(ids);
    filter = "AND s.id = ANY($1::int[])";
  }

  const q = `
  WITH today AS (SELECT (NOW() AT TIME ZONE 'Australia/Sydney')::date AS d)
  SELECT
    (SELECT d FROM today) AS date,
    s.id   AS shop_id,
    s.name AS shop_name,
    g.id   AS girl_id,
    g.name AS girl_name,
    g.origin,
    g.profile_url,
    g.photo_url,
    r.shift_text,
    COALESCE(MAX(v.count), 0) AS views,
    COUNT(r2.id)::int AS comments_count
  FROM roster_entries r
JOIN girls g ON g.id = r.girl_id
JOIN shops s ON s.id = r.shop_id
LEFT JOIN girl_views v ON v.girl_id = g.id
LEFT JOIN girl_comments r2 ON r2.girl_id = g.id
WHERE r.date = (SELECT d FROM today)
GROUP BY s.id, s.name, g.id, g.name, g.origin, g.profile_url, g.photo_url, r.shift_text, v.count
ORDER BY s.name, COALESCE(g.name, '') ASC;
  `;
  const { rows } = await pool.query(q, params);

  const grouped = new Map<number, { id: number; name: string; girls: any[] }>();
  const date = rows[0]?.date ?? null;

  for (const row of rows) {
    if (!grouped.has(row.shop_id)) {
      grouped.set(row.shop_id, {
        id: row.shop_id,
        name: row.shop_name,
        girls: [],
      });
    }
    grouped.get(row.shop_id)!.girls.push({
      id: row.girl_id,
      name: row.girl_name,
      origin: normalizeOrigin(row.origin),
      shift: row.shift_text || "",
      profileUrl: row.profile_url,
      photoUrl: row.photo_url,
      views: row.views,
      commentsCount: row.comments_count,
    });
  }

  res.json({ date, shops: Array.from(grouped.values()) });
});

// --- Views ------------------------------------------------------------------
app.post("/api/views/:girl_id", async (req: Request, res: Response) => {
  const { girl_id } = req.params;
  try {
    const q = `
      INSERT INTO girl_views (girl_id, count)
      VALUES ($1, 1)
      ON CONFLICT (girl_id)
      DO UPDATE SET count = girl_views.count + 1
      RETURNING count;
    `;
    const { rows } = await pool.query(q, [girl_id]);
    res.json({ girl_id, count: rows[0].count });
  } catch (err) {
    console.error("view error", err);
    res.status(500).json({ error: "Could not increment views" });
  }
});

app.get("/api/views", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT girl_id, count FROM girl_views");
    res.json(rows);
  } catch (err) {
    console.error("views fetch error", err);
    res.status(500).json({ error: "Could not fetch views" });
  }
});

// --- Comments ----------------------------------------------------------------
app.post("/api/comments/:girl_id", async (req: Request, res: Response) => {
  const { girl_id } = req.params;
  const { rating, comment } = req.body;
  try {
    const q = `
      INSERT INTO girl_comments (girl_id, rating, comment)
      VALUES ($1, $2, $3)
      RETURNING id, girl_id, rating, comment, created_at;
    `;
    const { rows } = await pool.query(q, [girl_id, rating, comment]);
    res.json(rows[0]);
  } catch (err) {
    console.error("comment insert error", err);
    res.status(500).json({ error: "Could not add comment" });
  }
});

app.get("/api/comments/:girl_id", async (req: Request, res: Response) => {
  const { girl_id } = req.params;
  try {
    const q = `
      SELECT id, rating, comment, created_at
      FROM girl_comments
      WHERE girl_id = $1
      ORDER BY created_at DESC;
    `;
    const { rows } = await pool.query(q, [girl_id]);
    res.json(rows);
  } catch (err) {
    console.error("comment fetch error", err);
    res.status(500).json({ error: "Could not fetch comments" });
  }
});

// --- Contact (inline routes for admin convenience) ---------------------------
app.post("/api/contact", async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  try {
    const q = `
      INSERT INTO contact_messages (message, created_at)
      VALUES ($1, NOW())
      RETURNING id, message, created_at;
    `;
    const { rows } = await pool.query(q, [message]);
    res.json(rows[0]);
  } catch (err) {
    console.error("contact insert error", err);
    res.status(500).json({ error: "Could not save message" });
  }
});

app.get("/api/contact", async (_req: Request, res: Response) => {
  try {
    const q = `
      SELECT id, message, created_at
      FROM contact_messages
      ORDER BY created_at DESC;
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error("contact fetch error", err);
    res.status(500).json({ error: "Could not fetch messages" });
  }
});

/* -------------------------------------------------------------------------- */
/* START SERVER                                                               */
/* -------------------------------------------------------------------------- */
const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API on http://localhost:${port}`));
