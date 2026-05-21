import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse  } from "../../utils/response.js";
import authService from "./auth.service.js";

const createFirstUser = asyncHandler(async (req, res) => {
  const user = await authService.createFirstUser(req.body);
  return successResponse(res, 201, "First user initialized", {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
});

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  return successResponse(res, 201, "Register success", {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body.email, req.body.password);
  return successResponse(res, 200, "Login success", result);
});

const refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshToken(req.body.refreshToken);
  return successResponse(res, 200, "Token refreshed", result);
});

const logout = asyncHandler(async (req, res) => {
  return successResponse(res, 200, "Logout success");
});

export default {
  createFirstUser,
  register,
  login,
  refreshToken,
  logout
};
