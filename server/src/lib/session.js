import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function createSessionPayload(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function createSessionToken(user) {
  return jwt.sign(createSessionPayload(user), config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}
