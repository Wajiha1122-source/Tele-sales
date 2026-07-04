import { Router } from "express";
import jwt from "jsonwebtoken";
import { query } from "../db/index.js";
import { config } from "../config.js";
import { asyncHandler, AppError } from "../lib/http.js";
import { createSessionPayload, createSessionToken } from "../lib/session.js";

const MASTER_USER = "chmfj@live.com";
const MASTER_ROLE = "ceo";

export const ssoRouter = Router();

function fail(message, status = 401) {
  throw new AppError(status, `SSO login failed: ${message}`);
}

function isLocalhostUrl(value) {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

ssoRouter.get("/", asyncHandler(async (req, res) => {
  if (!config.sso.secret) fail("missing SSO_SECRET.", 500);
  if (!config.clientRedirectUrl) fail("missing CLIENT_URL.", 500);
  if (process.env.NODE_ENV === "production" && isLocalhostUrl(config.clientRedirectUrl)) {
    fail("invalid CLIENT_URL.", 500);
  }
  if (!req.query.token) fail("invalid or expired token.");

  let payload;
  try {
    payload = jwt.verify(req.query.token, config.sso.secret);
  } catch {
    fail("invalid or expired token.");
  }

  if (!payload.exp) fail("invalid or expired token.");
  if (payload.masterUser !== MASTER_USER) fail("unauthorized user.", 403);
  if (payload.role !== MASTER_ROLE) fail("unauthorized role.", 403);
  if (payload.app !== config.sso.appName) fail("app mismatch.", 403);

  const { rows } = await query(
    `SELECT id,name,email,role,is_active
       FROM users
      WHERE LOWER(email)=LOWER($1)
        AND role='CEO'
      LIMIT 1`,
    [config.sso.localCeoUsername]
  );
  const user = rows[0];
  if (!user || !user.is_active) fail("mapped CEO/admin user is unavailable.", 403);

  const appToken = createSessionToken(user);
  const sessionUser = encodeURIComponent(JSON.stringify(createSessionPayload(user)));
  const redirectPath = encodeURIComponent(config.sso.redirectPath);
  const url = new URL("/sso-complete", config.clientRedirectUrl);
  url.searchParams.set("token", appToken);
  url.searchParams.set("user", sessionUser);
  url.searchParams.set("redirect", redirectPath);
  res.redirect(302, url.toString());
}));
