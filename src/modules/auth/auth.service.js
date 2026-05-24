import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { query } from "../../db/mysql.js";
import ApiError from "../../utils/apiError.js";
import env from "../../config/env.js";
import { generateId } from "../../utils/id.js";

function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user.id), role: user.role, email: user.email },
    env.jwtAccessSecret,
    { expiresIn: env.jwtAccessExpiresIn }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ sub: String(user.id) }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn
  });
}

function mapUser(row) {
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function register(payload) {
  const email = payload.email.toLowerCase();
  const existing = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (existing.length > 0) {
    throw new ApiError(409, "Email already registered");
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);
  const userId = generateId();
  await query(
    "INSERT INTO users (id, name, email, password, phone, role, is_active) VALUES (?, ?, ?, ?, ?, 'user', 1)",
    [userId, payload.name, email, hashedPassword, payload.phone || null]
  );
  const rows = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);

  return mapUser(rows[0]);
}

async function createFirstUser(payload) {
  const countRows = await query("SELECT COUNT(*) AS total FROM users");
  if (Number(countRows[0].total) > 0) {
    throw new ApiError(409, "First user already initialized");
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);
  const email = payload.email.toLowerCase();
  const userId = generateId();
  await query(
    "INSERT INTO users (id, name, email, password, phone, role, is_active) VALUES (?, ?, ?, ?, ?, 'admin', 1)",
    [userId, payload.name, email, hashedPassword, payload.phone || null]
  );
  const rows = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);

  return mapUser(rows[0]);
}

async function login(email, password) {
  const rows = await query("SELECT * FROM users WHERE email = ? LIMIT 1", [email.toLowerCase()]);
  const user = rows[0];
  if (!user || !user.is_active) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  const normalizedUser = mapUser(user);
  const accessToken = signAccessToken(normalizedUser);
  const refreshToken = signRefreshToken(normalizedUser);

  return {
    user: {
      id: normalizedUser.id,
      name: normalizedUser.name,
      email: normalizedUser.email,
      role: normalizedUser.role
    },
    accessToken,
    refreshToken
  };
}

async function refreshToken(token) {
  try {
    const payload = jwt.verify(token, env.jwtRefreshSecret);
    const rows = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [payload.sub]);
    const user = rows[0];
    if (!user || !user.is_active) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const accessToken = signAccessToken(mapUser(user));
    return { accessToken };
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }
}

export default {
  createFirstUser,
  register,
  login,
  refreshToken
};
