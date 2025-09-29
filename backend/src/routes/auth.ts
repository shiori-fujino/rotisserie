// src/routes/auth.ts
import express from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";

const router = express.Router();

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "changeme";
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

/* -------------------------------------------------------------------------- */
/* Rate limiter (protect against brute force)                                 */
/* -------------------------------------------------------------------------- */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                   // max 5 login attempts per 15 min per IP
  message: { error: "Too many login attempts, try again later." },
});

/* -------------------------------------------------------------------------- */
/* Zod schema                                                                 */
/* -------------------------------------------------------------------------- */
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/* -------------------------------------------------------------------------- */
/* POST /login                                                                */
/* -------------------------------------------------------------------------- */
router.post("/login", loginLimiter, (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const { username, password } = parsed.data;

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token });
});

export default router;
