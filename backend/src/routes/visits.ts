//backend/src/routes/visits.ts 

import { Router } from "express";
import pool from "../db";
import { tightLimiter } from "../middleware/security";

const router = Router();

router.post("/", tightLimiter, async (_req, res) => { 
  try {
    const q = `
      INSERT INTO site_visits (date, count)
      VALUES (CURRENT_DATE, 1)
      ON CONFLICT (date)
      DO UPDATE SET count = site_visits.count + 1
      RETURNING count;
    `;
    const { rows } = await pool.query(q);
    res.json({ date: new Date().toISOString().slice(0, 10), count: rows[0].count });
  } catch (err) {
    console.error("visits insert error", err);
    res.status(500).json({ error: "Could not record visit" });
  }
});

export default router;
