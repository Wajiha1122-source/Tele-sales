import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const updates = [
  {
    email: "ahmad@tele-sales.com",
    passwordHash: "$2b$12$rvJaGgx.ufpiKlAAisP1Lu9KPpOFqF2kVLRDdxPM6R3V6MBn5Fu5q"
  },
  {
    email: "laiba@tele-sales.com",
    passwordHash: "$2b$12$3oFEJZKOgTbDpzU.BY7sjuL35U3EuRWkOGjUO1ofe7go8uAoKmoX6"
  }
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
});

try {
  const { rows } = await pool.query(
    `UPDATE users
        SET password_hash = CASE LOWER(email)
          WHEN LOWER($1) THEN $2
          WHEN LOWER($3) THEN $4
          ELSE password_hash
        END
      WHERE LOWER(email) IN (LOWER($1), LOWER($3))
      RETURNING id,name,email,role,is_active`,
    [updates[0].email, updates[0].passwordHash, updates[1].email, updates[1].passwordHash]
  );

  console.table(rows);
} finally {
  await pool.end();
}
