import jwt from "jsonwebtoken";
import User from "../../models/User.js";
import ApiError from "../../utils/apiError.js";
import env from "../../config/env.js";

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    env.jwtAccessSecret,
    { expiresIn: env.jwtAccessExpiresIn }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString() }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn
  });
}

async function register(payload) {
  const existingUser = await User.findOne({ email: payload.email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(409, "Email already registered");
  }

  const user = await User.create({
    name: payload.name,
    email: payload.email.toLowerCase(),
    password: payload.password,
    phone: payload.phone || null
  });

  return user;
}

async function createFirstUser(payload) {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    throw new ApiError(409, "First user already initialized");
  }

  const user = await User.create({
    name: payload.name,
    email: payload.email.toLowerCase(),
    password: payload.password,
    phone: payload.phone || null,
    role: "admin"
  });

  return user;
}

async function login(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    accessToken,
    refreshToken
  };
}

async function refreshToken(token) {
  try {
    const payload = jwt.verify(token, env.jwtRefreshSecret);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const accessToken = signAccessToken(user);
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
