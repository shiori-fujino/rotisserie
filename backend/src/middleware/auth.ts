// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const rawSecret = process.env.JWT_SECRET;
if (!rawSecret) {
  throw new Error("JWT_SECRET not set! Add it to your env variables.");
}
const JWT_SECRET: string = rawSecret; // ✅ narrowed type

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    jwt.verify(token, JWT_SECRET); // ✅ now TS is happy
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
