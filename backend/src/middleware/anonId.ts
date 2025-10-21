// src/middleware/anonId.ts
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

/**
 * Middleware: ensure every visitor has a stable anon id in a cookie.
 * - Cookie is HttpOnly (server-only), long-lived, SameSite Lax, Secure in prod.
 * - Exposes req.anonId for route handlers to use.
 */


export default function ensureAnonId(req: Request, res: Response, next: NextFunction) {
  // cookie-parser must be used in index.ts before this middleware
  const COOKIE_NAME = "rotisserie_anon";
  let anon = (req as any).cookies?.[COOKIE_NAME] as string | undefined;

  if (!anon) {
    anon = uuidv4();
    const oneYear = 1000 * 60 * 60 * 24 * 365;

    res.cookie(COOKIE_NAME, anon, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: oneYear,
    });
  }

  // expose it on the request for downstream handlers
  (req as any).anonId = anon;
  next();
}
