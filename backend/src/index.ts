import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://juno@localhost:5432/rotisserie',
});

// --- Health -----------------------------------------------------------------
app.get('/api/health', async (_req: Request, res: Response) => {
  const r = await pool.query("SELECT (NOW() AT TIME ZONE 'Australia/Sydney')::date AS today");
  res.json({ ok: true, today: r.rows[0].today });
});

// --- Shops (simple list) ----------------------------------------------------
app.get('/api/shops', async (_req: Request, res: Response) => {
  const q = `
    SELECT id, name, canonical_url AS url
    FROM shops
    ORDER BY name;
  `;
  const { rows } = await pool.query(q);
  res.json(rows);
});

// --- Today’s roster (optional ?shop_ids=2,5) --------------------------------
app.get('/api/roster/today', async (req: Request, res: Response) => {
  const idsParam = (req.query.shop_ids as string | undefined) || '';
  const ids = idsParam
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter(n => Number.isInteger(n));

  const params: any[] = [];
  let filter = '';
  if (ids.length) {
    params.push(ids);
    filter = 'AND s.id = ANY($1::int[])';
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
    COALESCE(MAX(v.count), 0) AS views,  -- ensure only one row
    COUNT(r2.id)::int AS reviews_count
  FROM roster_entries r
  JOIN girls g ON g.id = r.girl_id
  JOIN shops s ON s.id = r.shop_id
  LEFT JOIN girl_views v ON v.girl_id = g.id
  LEFT JOIN girl_reviews r2 ON r2.girl_id = g.id
  WHERE r.date = (SELECT d FROM today)
  GROUP BY s.id, s.name, g.id, g.name, g.origin, g.profile_url, g.photo_url, r.shift_text, v.count
  ORDER BY s.name, COALESCE(g.name, '') ASC;  
  `;
  const { rows } = await pool.query(q, params);

  const grouped = new Map<number, { id:number; name:string; girls:any[] }>();
  const date = rows[0]?.date ?? null;

  for (const row of rows) {
    if (!grouped.has(row.shop_id)) {
      grouped.set(row.shop_id, { id: row.shop_id, name: row.shop_name, girls: [] });
    }
    grouped.get(row.shop_id)!.girls.push({
      id: row.girl_id,
      name: row.girl_name,
      origin: row.origin || null,
      shift: row.shift_text || '',
      profileUrl: row.profile_url,
      photoUrl: row.photo_url,
      views: row.views,
      reviewsCount: row.reviews_count,
    });
  }

  res.json({ date, shops: Array.from(grouped.values()) });
});

// --- Views ------------------------------------------------------------------

// Increment view count for a girl
app.post('/api/views/:girl_id', async (req: Request, res: Response) => {
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
    console.error('view error', err);
    res.status(500).json({ error: 'Could not increment views' });
  }
});

// Get all views
app.get('/api/views', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT girl_id, count FROM girl_views');
    res.json(rows);
  } catch (err) {
    console.error('views fetch error', err);
    res.status(500).json({ error: 'Could not fetch views' });
  }
});

// --- Reviews ----------------------------------------------------------------

// Add a review
app.post('/api/reviews/:girl_id', async (req: Request, res: Response) => {
  const { girl_id } = req.params;
  const { rating, comment } = req.body;
  try {
    const q = `
      INSERT INTO girl_reviews (girl_id, rating, comment)
      VALUES ($1, $2, $3)
      RETURNING id, girl_id, rating, comment, created_at;
    `;
    const { rows } = await pool.query(q, [girl_id, rating, comment]);
    res.json(rows[0]);
  } catch (err) {
    console.error('review insert error', err);
    res.status(500).json({ error: 'Could not add review' });
  }
});

// Get all reviews for a girl
app.get('/api/reviews/:girl_id', async (req: Request, res: Response) => {
  const { girl_id } = req.params;
  try {
    const q = `
      SELECT id, rating, comment, created_at
      FROM girl_reviews
      WHERE girl_id = $1
      ORDER BY created_at DESC;
    `;
    const { rows } = await pool.query(q, [girl_id]);
    res.json(rows);
  } catch (err) {
    console.error('review fetch error', err);
    res.status(500).json({ error: 'Could not fetch reviews' });
  }
});

// --- Start ------------------------------------------------------------------
const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API on http://localhost:${port}`));
