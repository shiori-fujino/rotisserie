// backend/src/index.ts
import "dotenv/config";
import express from "express";
import pool from "./db";
import { securityMiddleware, makeLimiter, tightLimiter } from "./middleware/security";
import cors from "cors";

// route modules
import authRoutes from "./routes/auth";
import blogRoutes from "./routes/blog";
import commentsRoutes from "./routes/comments";
import contactRoutes from "./routes/contact";
import rosterRoutes from "./routes/roster";
import shopsRoutes from "./routes/shops";
import statsRoutes from "./routes/stats";
import visitsRoutes from "./routes/visits";
import viewsRoutes from "./routes/views";

console.log("DB URL:", process.env.DATABASE_URL);

const app = express();
app.set("trust proxy", 1); 
// ✅ CORS config goes BEFORE routes
app.use(
  cors({
    origin: [
      "https://rotisserie.vercel.app",     // local dev (CRA default)
      "https://rotisserie.today",  // your production frontend
    ],
    credentials: true,
  })
);
// global middlewares
app.use(express.json({ limit: "200kb" }));
app.use(securityMiddleware);

// base limiter for all /api routes
app.use("/api", makeLimiter());

// public + spam-prone → extra tight
app.use("/api/views", tightLimiter, viewsRoutes);
app.use("/api/comments", tightLimiter, commentsRoutes);
app.use("/api/contact", tightLimiter, contactRoutes);

// public read endpoints → base limiter is enough
app.use("/api/roster", rosterRoutes);
app.use("/api/shops", shopsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/visits", visitsRoutes);

// admin-only → already JWT protected
app.use("/api/auth", authRoutes);
app.use("/api/blog", blogRoutes);

// health check
app.get("/api/health", async (_req, res) => {
  const r = await pool.query(
    "SELECT (NOW() AT TIME ZONE 'Australia/Sydney')::date AS today"
  );
  res.json({ ok: true, today: r.rows[0].today });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () =>
  console.log(`🚀 API running on http://localhost:${port}`)
);
