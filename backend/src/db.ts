import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes("proxy.rlwy.net")
    ? { rejectUnauthorized: false } // only for public URL
    : undefined,
});

export default pool;
