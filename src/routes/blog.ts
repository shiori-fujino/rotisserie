import { Router } from "express";
import pool from "../db";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// GET /api/blog → list posts (public)
router.get("/", async (_req, res) => {
  try {
    const q = `SELECT id, title, content, created_at
               FROM blog_posts
               ORDER BY created_at DESC`;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
});

// POST /api/blog → add post (admin only)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { title, content } = req.body || {};
    if (!title || !content) {
      return res.status(400).json({ error: "Missing title or content" });
    }

    const q = `INSERT INTO blog_posts (title, content)
               VALUES ($1, $2)
               RETURNING id, title, content, created_at`;
    const { rows } = await pool.query(q, [title, content]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add blog post" });
  }
});

// PUT /api/blog/:id → update post (admin only)
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const { title, content, created_at } = req.body || {};
    if (!title && !content && !created_at) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const q = `
      UPDATE blog_posts
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          created_at = COALESCE($3, created_at)
      WHERE id = $4
      RETURNING id, title, content, created_at
    `;
    const { rows } = await pool.query(q, [
      title,
      content,
      created_at,
      req.params.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update blog post" });
  }
});

// DELETE /api/blog/:id → remove post (admin only)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const q = `DELETE FROM blog_posts WHERE id = $1 RETURNING *`;
    const { rows } = await pool.query(q, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ success: true, deleted: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete blog post" });
  }
});

export default router;
