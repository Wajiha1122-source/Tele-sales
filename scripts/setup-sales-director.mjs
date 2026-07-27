import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
});

try {
  await pool.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SALES_DIRECTOR'");
  await pool.query("ALTER TYPE update_audience ADD VALUE IF NOT EXISTS 'SALES_DIRECTOR'");

  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES ($1, LOWER($2), $3, 'SALES_DIRECTOR', TRUE)
     ON CONFLICT (email)
     DO UPDATE SET
       name = EXCLUDED.name,
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       is_active = TRUE
     RETURNING id,name,email,role,is_active`,
    [
      "Najum",
      "najum96@yahoo.com",
      "$2b$12$.hFLSm5teGZeWXDDjnRr8.eNcLkHePHnU6JKvJFOOARmcL.t.alqS"
    ]
  );

  console.table(rows);
} finally {
  await pool.end();
}
