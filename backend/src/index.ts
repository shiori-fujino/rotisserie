import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./db";

// route modules
import authRoutes from "./routes/auth";
import blogRoutes from "./routes/blog";
import commentsRoutes from "./routes/comments";
import contactRoutes from "./routes/contact";
import rosterRoutes from "./routes/roster";
import shopsRoutes from "./routes/shops";
import statsRoutes from "./routes/stats";
import visitsRoutes from "./routes/visits";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// mount
app.use("/api/auth", authRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/roster", rosterRoutes);
app.use("/api/shops", shopsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/visits", visitsRoutes);

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
