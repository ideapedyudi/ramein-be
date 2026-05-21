import jwt from "jsonwebtoken";
import env from "../config/env.js";
import ApiError from "../utils/apiError.js";
import User from "../models/User.js";

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ApiError(401, "Unauthorized"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    const user = await User.findById(payload.sub).select("-password");
    if (!user || !user.isActive) {
      return next(new ApiError(401, "Invalid user"));
    }
    req.user = user;
    return next();
  } catch (error) {
    return next(new ApiError(401, "Invalid token"));
  }
}

export default authenticate;
