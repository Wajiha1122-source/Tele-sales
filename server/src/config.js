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

const configuredClientUrls = (process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

export const config = {
  port: Number(process.env.PORT || 5000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  clientUrls: [...new Set([
    ...trustedClientUrls,
    ...configuredClientUrls
  ])],
  clientRedirectUrl: configuredClientUrls[0] || "",
  bootstrapAdminKey: process.env.BOOTSTRAP_ADMIN_KEY,
  sso: {
    // Change SSO_SECRET in the environment when rotating the Master Dashboard shared secret.
    secret: process.env.SSO_SECRET,
    // Change SSO_APP_NAME to the exact app value sent by the Master Dashboard.
    appName: process.env.SSO_APP_NAME || "Pulse CRM",
    // Change SSO_LOCAL_CEO_USERNAME to the mapped local CEO/admin user's email.
    localCeoUsername: process.env.SSO_LOCAL_CEO_USERNAME || "chmfj@live.com",
    // Change SSO_REDIRECT_PATH to the CEO/admin dashboard path after SSO login.
    redirectPath: process.env.SSO_REDIRECT_PATH || "/dashboard"
  }
};
