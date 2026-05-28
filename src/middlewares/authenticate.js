import jwt from "jsonwebtoken";
import env from "../config/env.js";
import ApiError from "../utils/apiError.js";
import { query } from "../db/mysql.js";

function getBearerToken(req) {
  const authHeader = req.get("authorization");
  if (!authHeader) return null;

  const match = authHeader.trim().match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function getUserFromToken(token) {
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    const rows = await query(
      "SELECT id, name, email, phone, role, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
      [payload.sub]
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      throw new ApiError(401, "Invalid user");
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: Boolean(user.is_active),
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Invalid token");
  }
}

async function authenticate(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return next(new ApiError(401, "Unauthorized"));
  }

  try {
    req.user = await getUserFromToken(token);
    return next();
  } catch (error) {
    return next(error);
  }
}

export {
  getBearerToken,
  getUserFromToken
};

export default authenticate;
