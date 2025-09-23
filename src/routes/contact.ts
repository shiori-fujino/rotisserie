// routes/contact.ts
import express from "express";
import pool  from "../db"; // your Postgres pool

const router = express.Router();

router.post("/", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  try {
    await pool.query(
      "INSERT INTO contact_messages (message, created_at) VALUES ($1, NOW())",
      [message]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database insert failed" });
  }
});

export default router;
