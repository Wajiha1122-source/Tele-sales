BEGIN;

WITH existing_ahmad AS (
  SELECT id
  FROM users
  WHERE role = 'EXECUTIVE'
    AND LOWER(email) = LOWER('ahmad@tele-sales.com')
  LIMIT 1
),
first_existing_executive AS (
  SELECT id
  FROM users
  WHERE role = 'EXECUTIVE'
    AND LOWER(email) <> LOWER('laiba@tele-sales.com')
    AND NOT EXISTS (SELECT 1 FROM existing_ahmad)
  ORDER BY created_at ASC
  LIMIT 1
),
ahmad_target AS (
  SELECT id FROM existing_ahmad
  UNION ALL
  SELECT id FROM first_existing_executive
  LIMIT 1
),
updated_ahmad AS (
  UPDATE users
  SET
    name = 'Ahmad',
    email = LOWER('ahmad@tele-sales.com'),
    password_hash = '$2b$12$VZCxI8mUFmGkkWVYw8dS8OmLmv9P/.qXvtT15w513r1WTJXfrsxqO',
    role = 'EXECUTIVE',
    is_active = TRUE
  WHERE id = (SELECT id FROM ahmad_target)
  RETURNING id
)
INSERT INTO users (name, email, password_hash, role, is_active)
SELECT
  'Ahmad',
  LOWER('ahmad@tele-sales.com'),
  '$2b$12$VZCxI8mUFmGkkWVYw8dS8OmLmv9P/.qXvtT15w513r1WTJXfrsxqO',
  'EXECUTIVE',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM updated_ahmad)
ON CONFLICT (email)
DO UPDATE SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = TRUE;

INSERT INTO users (name, email, password_hash, role, is_active)
VALUES (
  'Laiba',
  LOWER('laiba@tele-sales.com'),
  '$2b$12$o0n7zk2/Yfd7yY6kz2QsG.DKomTzYfZt7beXVzoj4KhUes6pvd.jW',
  'EXECUTIVE',
  TRUE
)
ON CONFLICT (email)
DO UPDATE SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = TRUE;

COMMIT;

SELECT id, name, email, role, is_active
FROM users
WHERE LOWER(email) IN (LOWER('ahmad@tele-sales.com'), LOWER('laiba@tele-sales.com'))
ORDER BY name;
