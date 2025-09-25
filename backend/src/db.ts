import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // 👈 prefer this
  ssl: process.env.DATABASE_URL?.includes("railway") ? { rejectUnauthorized: false } : undefined,
});

export default pool;
