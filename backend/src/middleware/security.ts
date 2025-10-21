// backend/src/middleware/security.ts
import helmet from "helmet";
import cors from "cors";
import rateLimit, { Options } from "express-rate-limit";

export const securityMiddleware = [
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
];

export const makeLimiter = (opts?: Partial<Options>) =>
  rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: 200,               // 120 requests per IP per window
    standardHeaders: true,    // send rate limit info in headers
    legacyHeaders: false,     // don’t use old headers
    ...opts,
  });

// Strict limiter for spammy endpoints (e.g. comments, contact forms)
export const tightLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 100,
});
