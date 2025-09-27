import { Router } from "express";
import pool from "../db";

const router = Router();

router.post("/", async (_req, res) => {
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
