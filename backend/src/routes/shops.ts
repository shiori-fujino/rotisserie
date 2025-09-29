//backend/src/routes/shops.ts

import { Router } from "express";
import pool from "../db";

const router = Router();

router.get("/", async (_req, res) => {
  const q = `SELECT id, name, canonical_url AS url FROM shops ORDER BY name;`;
  const { rows } = await pool.query(q);
  res.json(rows);
});

export default router;
