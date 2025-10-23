import { Router } from "express";
import pool from "../db";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
    const q = `
      SELECT 
        g.id,
        g.name,
        g.origin,
        g.profile_url,
        s.name AS shop_name,
        s.slug AS shop_slug,
        r.last_seen,
        COALESCE(v.views, 0) AS views,
        g.cached_avg_rating AS avg_rating
      FROM girls g
      LEFT JOIN shops s ON s.id = g.shop_id

      -- 🕓 most recent roster date per girl
      LEFT JOIN (
        SELECT girl_id, MAX(date) AS last_seen
        FROM roster_entries
        GROUP BY girl_id
      ) r ON r.girl_id = g.id

      -- 👀 total views per girl
      LEFT JOIN (
        SELECT girl_id, SUM(count) AS views
        FROM girl_views
        GROUP BY girl_id
      ) v ON v.girl_id = g.id

      ORDER BY r.last_seen DESC NULLS LAST;
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
}));

// GET /api/girls/:id — single girl with full details
router.get("/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  
  // Get basic girl info first
  const girlQuery = `
    SELECT 
      g.id,
      g.name,
      g.origin,
      g.profile_url,
      g.photo_url,
      g.cached_avg_rating AS avg_rating
    FROM girls g
    WHERE g.id = $1
  `;
  
  const girlResult = await pool.query(girlQuery, [id]);
  
  if (girlResult.rows.length === 0) {
    return res.status(404).json({ error: "Girl not found" });
  }
  
  const girl = girlResult.rows[0];
  
  // Get shop info
  const shopQuery = `
    SELECT s.name, s.slug
    FROM shops s
    JOIN girls g ON g.shop_id = s.id
    WHERE g.id = $1
  `;
  const shopResult = await pool.query(shopQuery, [id]);
  const shop = shopResult.rows[0] || {};
  
  // Get views
  const viewsQuery = `
    SELECT COALESCE(SUM(count), 0) AS views
    FROM girl_views
    WHERE girl_id = $1
  `;
  const viewsResult = await pool.query(viewsQuery, [id]);
  const views = viewsResult.rows[0]?.views || 0;
  
  // Get last seen
  const lastSeenQuery = `
    SELECT MAX(date) AS last_seen
    FROM roster_entries
    WHERE girl_id = $1
  `;
  const lastSeenResult = await pool.query(lastSeenQuery, [id]);
  const lastSeen = lastSeenResult.rows[0]?.last_seen || null;
  
  // Get all reviews/roasts for this girl
  const reviewsQuery = `
    SELECT 
      re.id,
      re.rating,
      re.reply as comment,
      re.created_at,
      re.user_mask as author
    FROM replies re
    JOIN roasts ro ON ro.id = re.roast_id
    WHERE ro.girl_id = $1
    ORDER BY re.created_at DESC
  `;
  const reviewsResult = await pool.query(reviewsQuery, [id]);
  
  res.json({
    ...girl,
    shop_name: shop.name || null,
    shop_slug: shop.slug || null,
    views: Number(views),
    last_seen: lastSeen,
    reviews: reviewsResult.rows,
    photo_url: girl.photo_url || girl.profile_url,  // Use photo_url first, fallback to profile_url
    photos: girl.photo_url ? [girl.photo_url] : [],
  });
}));

export default router;