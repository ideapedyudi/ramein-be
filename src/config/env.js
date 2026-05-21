import dotenv from "dotenv";

dotenv.config();

function readEnv(key, fallback = "") {
  const value = process.env[key];
  if (typeof value === "string") return value.trim();
  return fallback;
}

const env = {
  port: Number(readEnv("PORT", "3000")),
  nodeEnv: readEnv("NODE_ENV", "development"),
  appBaseUrl: readEnv("APP_BASE_URL", "http://localhost:3000"),
  mongodbUri: readEnv("MONGODB_URI", "mongodb://127.0.0.1:27017/ramein"),
  jwtAccessSecret: readEnv("JWT_ACCESS_SECRET", "access-secret-dev"),
  jwtRefreshSecret: readEnv("JWT_REFRESH_SECRET", "refresh-secret-dev"),
  jwtAccessExpiresIn: readEnv("JWT_ACCESS_EXPIRES_IN", "15m"),
  jwtRefreshExpiresIn: readEnv("JWT_REFRESH_EXPIRES_IN", "7d"),
  midtransServerKey: readEnv("MIDTRANS_SERVER_KEY"),
  midtransClientKey: readEnv("MIDTRANS_CLIENT_KEY"),
  midtransIsProduction: readEnv("MIDTRANS_IS_PRODUCTION", "false").toLowerCase() === "true",
  midtransNotificationUrl: readEnv("MIDTRANS_NOTIFICATION_URL")
};

export default env;
