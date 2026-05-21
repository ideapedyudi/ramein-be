import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse  } from "../../utils/response.js";
import { query } from "../../db/mysql.js";

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

  return successResponse(res, 200, "Profile updated", {
    _id: user.id,
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: Boolean(user.is_active),
    createdAt: user.created_at,
    updatedAt: user.updated_at
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const rows = await query(
    "SELECT id, name, email, phone, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC"
  );
  const users = rows.map((user) => ({
    _id: user.id,
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: Boolean(user.is_active),
    createdAt: user.created_at,
    updatedAt: user.updated_at
  }));
  return successResponse(res, 200, "User list", users);
});

export default {
  getMe,
  updateMe,
  listUsers
};
