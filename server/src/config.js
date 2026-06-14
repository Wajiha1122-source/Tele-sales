import "dotenv/config";

const required = ["DATABASE_URL", "JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

const trustedClientUrls = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://tele-sales-client.vercel.app"
];

export const config = {
  port: Number(process.env.PORT || 5000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  clientUrls: [...new Set([
    ...trustedClientUrls,
    ...(process.env.CLIENT_URL || "").split(",").map((url) => url.trim()).filter(Boolean)
  ])],
  bootstrapAdminKey: process.env.BOOTSTRAP_ADMIN_KEY
};
