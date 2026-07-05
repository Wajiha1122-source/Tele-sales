import { Router } from "express";
import jwt from "jsonwebtoken";
import { query } from "../db/index.js";
import { config } from "../config.js";
import { asyncHandler, AppError } from "../lib/http.js";
import { createSessionPayload, createSessionToken } from "../lib/session.js";

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
  const masterUser = String(payload.masterUser || "").trim().toLowerCase();
  const masterRole = String(payload.role || "").trim().toLowerCase();

  if (masterUser !== config.sso.masterUser) fail("unauthorized user.", 403);
  if (masterRole !== config.sso.masterRole) fail("unauthorized role.", 403);
  if (payload.app !== config.sso.appName) fail("app mismatch.", 403);

  const { rows } = await query(
    `SELECT id,name,email,role,is_active
       FROM users
       WHERE LOWER(email)=LOWER($1)
       LIMIT 1`,
    [config.sso.localCeoUsername]
  );
  const user = rows[0];
  if (!user) fail("mapped CEO/admin user does not exist.", 403);
  if (user.role !== "CEO") fail("mapped CEO/admin user is not a CEO account.", 403);
  if (!user.is_active) fail("mapped CEO/admin user is inactive.", 403);

  const appToken = createSessionToken(user);
  const sessionUser = encodeURIComponent(JSON.stringify(createSessionPayload(user)));
  const redirectPath = encodeURIComponent(config.sso.redirectPath);
  const url = new URL("/sso-complete", config.clientRedirectUrl);
  url.searchParams.set("token", appToken);
  url.searchParams.set("user", sessionUser);
  url.searchParams.set("redirect", redirectPath);
  res.redirect(302, url.toString());
}));
