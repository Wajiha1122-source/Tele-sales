import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { AppError } from "../lib/http.js";

export function authenticate(req, _res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return next(new AppError(401, "Authentication required"));
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    next(new AppError(401, "Invalid or expired session"));
  }
}

export const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) return next(new AppError(403, "Insufficient permissions"));
  next();
};
