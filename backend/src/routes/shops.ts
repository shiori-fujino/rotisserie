import { Router } from "express";
import pool from "../db";

const router = Router();

// GET /api/shops → list all shops + today’s girl count
router.get("/", async (_req, res) => {
  try {
    const q = `
      SELECT s.id,
             s.name,
             s.slug,
             s.address,
             s.lat,
             s.lng,
             COUNT(r.id) AS girls_today
      FROM shops s
      LEFT JOIN roster_entries r
        ON r.shop_id = s.id
       AND r.date = CURRENT_DATE
      GROUP BY s.id
      ORDER BY s.name;
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch shops" });
  }
});

// GET /api/shops/:slug → single shop (for ShopPage)
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    console.log("Fetching shop:", slug);

    const shopRes = await pool.query(
      `SELECT id, name, slug, address, lat, lng, phone, url, area, last_scraped
         FROM shops
        WHERE slug = $1
        LIMIT 1;`,
      [slug]
    );
    if (shopRes.rows.length === 0)
      return res.status(404).json({ error: "Shop not found" });

    const shop = shopRes.rows[0];
    console.log("→ shop found:", shop.id, shop.name);

    // ✅ simplified — no girl_photos join
    const rosterQ = `
      SELECT g.id, g.name, g.origin, g.profile_url, g.photo_url
        FROM roster_entries r
        JOIN girls g ON g.id = r.girl_id
       WHERE r.shop_id = $1
         AND r.date = CURRENT_DATE
       GROUP BY g.id;
    `;
    const rosterRes = await pool.query(rosterQ, [shop.id]);
    shop.roster_today = rosterRes.rows;

    const girlsQ = `
      SELECT g.id, g.name, g.origin, g.profile_url, g.photo_url
        FROM girls g
       WHERE g.shop_id = $1
       ORDER BY g.name;
    `;
    const girlsRes = await pool.query(girlsQ, [shop.id]);
    shop.girls = girlsRes.rows;

    res.json(shop);
  } catch (err) {
    console.error("❌ Error fetching shop:", err);
    res.status(500).json({ error: "Failed to fetch shop" });
  }
});

export default router;
