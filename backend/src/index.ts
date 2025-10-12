// backend/src/index.ts
import "dotenv/config";
import express from "express";
import pool from "./db";
import { securityMiddleware, makeLimiter, tightLimiter } from "./middleware/security";
import cors from "cors";

// route modules
import authRoutes from "./routes/auth";
import blogRoutes from "./routes/blog";
import contactRoutes from "./routes/contact";
import rosterRoutes from "./routes/roster";
import shopsRoutes from "./routes/shops";
import statsRoutes from "./routes/stats";
import visitsRoutes from "./routes/visits";
import viewsRoutes from "./routes/views";

import cookieParser from "cookie-parser";
import ensureAnonId from "./middleware/anonId";
import roastsRouter from "./routes/roasts";
import repliesRouter from "./routes/replies";
import girlsRouter from "./routes/girls";
import adminRoutes from "./routes/admin";


console.log("DB URL:", process.env.DATABASE_URL);

const app = express();
app.set("trust proxy", 1); 
// ✅ CORS config goes BEFORE routes
app.use(
  cors({
    origin: [
      "https://rotisserie.vercel.app",
      "https://rotisserie.today",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);


// global middlewares
app.use(express.json({ limit: "200kb" }));
app.use(securityMiddleware);
app.use(cookieParser());
app.use(ensureAnonId);

// base limiter for all /api routes
app.use("/api", makeLimiter());

// public + spam-prone → extra tight
app.use("/api/views", tightLimiter, viewsRoutes);
app.use("/api/contact", tightLimiter, contactRoutes);
app.use("/api/roasts", roastsRouter);
app.use("/api/replies", repliesRouter);
app.use("/api/girls", girlsRouter);

// public read endpoints → base limiter is enough
app.use("/api/roster", rosterRoutes);
app.use("/api/shops", shopsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/visits", visitsRoutes);

// admin-only → already JWT protected
app.use("/api/auth", authRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/admin", adminRoutes);

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
