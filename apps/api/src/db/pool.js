import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Add it to apps/api/.env");
}

const pool = new Pool({ connectionString });

export default pool;
