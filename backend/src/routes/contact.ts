// src/routes/contact.ts
import express from "express";
import pool from "../db";
import jwt from "jsonwebtoken";
import { z } from "zod";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* Zod schema                                                                 */
/* -------------------------------------------------------------------------- */
const contactSchema = z.object({
  message: z.string().trim().min(1, "Message required").max(2000, "Too long"),
});

/* -------------------------------------------------------------------------- */
/* POST new contact message                                                   */
/* -------------------------------------------------------------------------- */
router.post("/", async (req, res) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const { message } = parsed.data;

    await pool.query(
      "INSERT INTO contact_messages (message, created_at) VALUES ($1, NOW())",
      [message]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("contact insert error", err);
    res.status(500).json({ error: "Database insert failed" });
  }
});

/* -------------------------------------------------------------------------- */
/* GET all contact messages (admin only)                                      */
/* -------------------------------------------------------------------------- */
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
