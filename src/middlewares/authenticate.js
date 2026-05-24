import jwt from "jsonwebtoken";
import env from "../config/env.js";
import ApiError from "../utils/apiError.js";
import { query } from "../db/mysql.js";

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ApiError(401, "Unauthorized"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    const rows = await query(
      "SELECT id, name, email, phone, role, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
      [payload.sub]
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      return next(new ApiError(401, "Invalid user"));
    }
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: Boolean(user.is_active),
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
    return next();
  } catch (error) {
    return next(new ApiError(401, "Invalid token"));
  }
}

export default authenticate;
