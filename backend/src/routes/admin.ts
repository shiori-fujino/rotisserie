// src/routes/admin.ts
import { Router } from "express";
import pool from "../db";
import { requireAdmin } from "../middleware/auth";

const router = Router();
const ALLOWED_TABLES = [
  'shops',
  'girls', 
  'roasts',
  'replies',
  'blog_posts',
  'contact_messages',
  'site_visits',
  'roster_entries',
  'girl_views',
] as const;

router.get("/table", requireAdmin, async (req, res) => {
  const table = req.query.name as string;
  if (!table || !ALLOWED_TABLES.includes(table as any)) {
    return res.status(400).json({ 
      error: "Invalid table name",
      allowed: ALLOWED_TABLES 
    });
  }

  const { shop, origin, sort } = req.query;

  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = (page - 1) * limit;

  const params: any[] = [];
  const where: string[] = [];
  let query = `SELECT * FROM ${table}`;
  let countQuery = `SELECT COUNT(*) FROM ${table}`;

  // filters only for girls
  if (table === "girls") {
    if (shop) {
      const idx = params.length + 1;
      where.push(`shop_id = (SELECT id FROM shops WHERE name = $${idx})`);
      params.push(shop);
    }
    if (origin) {
      const idx = params.length + 1;
      where.push(`LOWER(origin) LIKE LOWER($${idx})`);
      params.push(`%${origin}%`);
    }
  }

  if (where.length) {
    const whereClause = ` WHERE ${where.join(" AND ")}`;
    query += whereClause;
    countQuery += whereClause;
  }

  // sorting
  if (sort === "name-asc") query += " ORDER BY LOWER(name) ASC";
  else if (sort === "name-desc") query += " ORDER BY LOWER(name) DESC";
  else if (sort === "id-asc") query += " ORDER BY id ASC";
  else query += " ORDER BY id DESC";

  query += ` LIMIT ${limit} OFFSET ${offset}`;

  try {
    const [data, count, distinctOrigins] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params),
      table === "girls"
        ? pool.query("SELECT DISTINCT origin FROM girls WHERE origin IS NOT NULL")
        : Promise.resolve({ rows: [] }),
    ]);

    let rows = data.rows;


    // normalize all distinct origins globally
    const allOrigins =
  table === "girls"
    ? Array.from(
        new Set(
          distinctOrigins.rows
            .map((r: any) => r.origin)  // raw values
            .filter(Boolean)
        )
      ).sort()
    : [];

    res.json({
      rows,
      total: Number(count.rows[0].count),
      allOrigins, // 👈 for frontend dropdown
    });
  } catch (err) {
    console.error("admin table fetch fail", err);
    res.status(500).json({ error: "Query failed" });
  }
});

router.patch("/girl/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, origin } = req.body;

  try {
    const result = await pool.query(
      `UPDATE girls SET 
         name = COALESCE($1, name), 
         origin = COALESCE($2, origin),
         manual_override = TRUE  -- ✅ ADD THIS
       WHERE id = $3
       RETURNING *`,
      [name, origin, id]
    );
    res.json({ updated: result.rows[0] });
  } catch (err) {
    console.error("admin update girl fail", err);
    res.status(500).json({ error: "Update failed" });
  }
});

router.delete("/girl/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("DELETE FROM girls WHERE id = $1", [id]);
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Girl not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("admin delete girl fail", err);
    res.status(500).json({ error: "Delete failed" });
  }
});
/* -------------------- PATCH /api/admin/shop/:id -------------------- */
router.patch("/shop/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, canonical_url, address, lat, lng } = req.body;

  try {
    const q = `
      UPDATE shops
      SET
        name = COALESCE($1, name),
        canonical_url = COALESCE($2, canonical_url),
        address = COALESCE($3, address),
        lat = COALESCE($4, lat),
        lng = COALESCE($5, lng)
      WHERE id = $6
      RETURNING *;
    `;

    const { rows } = await pool.query(q, [name, canonical_url, address, lat, lng, id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Shop not found" });
    }

    res.json({ updated: rows[0] });
  } catch (err) {
    console.error("update shop fail", err);
    res.status(500).json({ error: "Failed to update shop" });
  }
});
export default router;
