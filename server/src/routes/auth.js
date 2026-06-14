import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db/index.js";
import { config } from "../config.js";
import { asyncHandler, AppError, validate } from "../lib/http.js";
import { loginSchema, registerSchema } from "../lib/schemas.js";

export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AppError(401, "Invalid email or password");
  }
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

authRouter.post("/register", validate(registerSchema), asyncHandler(async (req, _res, next) => {
  const count = await query("SELECT COUNT(*)::int AS count FROM users");
  if (count.rows[0].count === 0 && req.body.bootstrapKey === config.bootstrapAdminKey) return next();
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) throw new AppError(401, "CEO authentication required");
  try {
    req.user = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new AppError(401, "Invalid or expired session");
  }
  if (req.user.role !== "CEO") throw new AppError(403, "Only the CEO can create users");
  next();
}), asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await query(
      "INSERT INTO users(name,email,password_hash,role) VALUES($1,LOWER($2),$3,$4) RETURNING id,name,email,role,created_at",
      [name, email, hash, role]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "23505") throw new AppError(409, "Email already exists");
    throw error;
  }
}));
