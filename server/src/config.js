import "dotenv/config";

const required = ["DATABASE_URL", "JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

export const config = {
  port: Number(process.env.PORT || 5000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  clientUrls: (process.env.CLIENT_URL || "http://localhost:3000,http://localhost:3001")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  bootstrapAdminKey: process.env.BOOTSTRAP_ADMIN_KEY
};
