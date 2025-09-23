// src/routes/auth.ts
import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "changeme";
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Create token
  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

export default router;
