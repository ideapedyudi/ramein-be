import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { query } from "../../db/mysql.js";
import ApiError from "../../utils/apiError.js";
import env from "../../config/env.js";
import { generateId } from "../../utils/id.js";

const googleClient = new OAuth2Client(env.googleClientId || undefined);

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
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    googleId: row.google_id,
    authProvider: row.auth_provider,
    role: row.role,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function buildAuthResponse(user, extra = {}) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    accessToken,
    refreshToken,
    ...extra
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
  return buildAuthResponse(normalizedUser);
}

async function verifyGoogleToken(idToken) {
  if (!env.googleClientId) {
    throw new ApiError(500, "Google auth is not configured");
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.googleClientId
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email) {
      throw new ApiError(401, "Invalid Google token");
    }
    if (!payload.email_verified) {
      throw new ApiError(401, "Google email is not verified");
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email.split("@")[0]
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Invalid Google token");
  }
}

async function googleAuth(payload) {
  const idToken = payload.idToken || payload.credential;
  const googleUser = await verifyGoogleToken(idToken);

  const googleRows = await query("SELECT * FROM users WHERE google_id = ? LIMIT 1", [googleUser.googleId]);
  const googleLinkedUser = googleRows[0];
  if (googleLinkedUser) {
    if (!googleLinkedUser.is_active) throw new ApiError(401, "Invalid credentials");
    return buildAuthResponse(mapUser(googleLinkedUser), { isNewUser: false });
  }

  const emailRows = await query("SELECT * FROM users WHERE email = ? LIMIT 1", [googleUser.email]);
  const existingUser = emailRows[0];
  if (existingUser) {
    if (!existingUser.is_active) throw new ApiError(401, "Invalid credentials");
    if (existingUser.google_id && existingUser.google_id !== googleUser.googleId) {
      throw new ApiError(409, "Email already linked to another Google account");
    }

    await query(
      "UPDATE users SET google_id = ?, auth_provider = 'google' WHERE id = ?",
      [googleUser.googleId, existingUser.id]
    );
    const rows = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [existingUser.id]);
    return buildAuthResponse(mapUser(rows[0]), { isNewUser: false });
  }

  const userId = generateId();
  const randomPassword = await bcrypt.hash(generateId(), 10);
  await query(
    `INSERT INTO users (
      id,
      name,
      email,
      password,
      phone,
      google_id,
      auth_provider,
      role,
      is_active
    ) VALUES (?, ?, ?, ?, NULL, ?, 'google', 'user', 1)`,
    [userId, googleUser.name, googleUser.email, randomPassword, googleUser.googleId]
  );
  const rows = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);

  return buildAuthResponse(mapUser(rows[0]), { isNewUser: true });
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
  googleAuth,
  refreshToken
};
