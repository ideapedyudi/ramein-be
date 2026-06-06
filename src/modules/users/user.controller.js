import bcrypt from "bcryptjs";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/apiError.js";
import { generateId } from "../../utils/id.js";
import { successResponse  } from "../../utils/response.js";
import { query } from "../../db/mysql.js";

function mapUser(user) {
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
}

const getMe = asyncHandler(async (req, res) => {
  return successResponse(res, 200, "User profile", req.user);
});

const updateMe = asyncHandler(async (req, res) => {
  const nextName = req.body.name !== undefined ? req.body.name : req.user.name;
  const nextPhone = req.body.phone !== undefined ? req.body.phone : req.user.phone;

  await query("UPDATE users SET name = ?, phone = ? WHERE id = ?", [nextName, nextPhone, req.user.id]);
  const rows = await query(
    "SELECT id, name, email, phone, role, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
    [req.user.id]
  );
  const user = rows[0];

  return successResponse(res, 200, "Profile updated", mapUser(user));
});

const listUsers = asyncHandler(async (req, res) => {
  const rows = await query(
    "SELECT id, name, email, phone, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC"
  );
  const users = rows.map(mapUser);
  return successResponse(res, 200, "User list", users);
});

const listAdmins = asyncHandler(async (req, res) => {
  const rows = await query(
    "SELECT id, name, email, phone, role, is_active, created_at, updated_at FROM users WHERE role = 'admin' ORDER BY created_at DESC"
  );
  const users = rows.map(mapUser);
  return successResponse(res, 200, "Admin user list", users);
});

const listRoleUsers = asyncHandler(async (req, res) => {
  const rows = await query(
    "SELECT id, name, email, phone, role, is_active, created_at, updated_at FROM users WHERE role = 'user' ORDER BY created_at DESC"
  );
  const users = rows.map(mapUser);
  return successResponse(res, 200, "Role user list", users);
});

const createAdmin = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  const existing = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (existing.length > 0) {
    throw new ApiError(409, "Email already registered");
  }

  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const userId = generateId();
  await query(
    "INSERT INTO users (id, name, email, password, phone, role, is_active) VALUES (?, ?, ?, ?, ?, 'admin', 1)",
    [userId, req.body.name, email, hashedPassword, req.body.phone || null]
  );

  const rows = await query(
    "SELECT id, name, email, phone, role, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
    [userId]
  );

  return successResponse(res, 201, "Admin user created", mapUser(rows[0]));
});

export default {
  getMe,
  updateMe,
  listUsers,
  listAdmins,
  listRoleUsers,
  createAdmin
};
