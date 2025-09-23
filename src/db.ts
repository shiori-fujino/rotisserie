import { Pool } from "pg";

const pool = new Pool({
  user: process.env.PGUSER || "juno",
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE || "rotisserie",
  password: process.env.PGPASSWORD || "",
  port: Number(process.env.PGPORT) || 5432,
});

export default pool;
