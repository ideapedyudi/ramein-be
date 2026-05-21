import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse  } from "../../utils/response.js";
import User from "../../models/User.js";

const getMe = asyncHandler(async (req, res) => {
  return successResponse(res, 200, "User profile", req.user);
});

const updateMe = asyncHandler(async (req, res) => {
  const fields = ["name", "phone"];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      req.user[field] = req.body[field];
    }
  });

  await req.user.save();
  return successResponse(res, 200, "Profile updated", req.user);
});

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");
  return successResponse(res, 200, "User list", users);
});

export default {
  getMe,
  updateMe,
  listUsers
};
