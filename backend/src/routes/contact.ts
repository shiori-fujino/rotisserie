// routes/contact.ts
import express from "express";
import pool  from "../db"; // your Postgres pool
import jwt from "jsonwebtoken";

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

router.get("/", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "No token" });

    const token = auth.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET || "supersecret");

    const { rows } = await pool.query(
      "SELECT id, message, created_at FROM contact_messages ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("contact get error", err);
    res.status(500).json({ error: "Could not fetch messages" });
  }
});

export default router;
