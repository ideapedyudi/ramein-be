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
  mysqlHost: readEnv("MYSQL_HOST", "127.0.0.1"),
  mysqlPort: Number(readEnv("MYSQL_PORT", "3306")),
  mysqlUser: readEnv("MYSQL_USER", "root"),
  mysqlPassword: readEnv("MYSQL_PASSWORD", ""),
  mysqlDatabase: readEnv("MYSQL_DATABASE", "ramein"),
  mysqlPoolLimit: Number(readEnv("MYSQL_POOL_LIMIT", "10")),
  jwtAccessSecret: readEnv("JWT_ACCESS_SECRET", "access-secret-dev"),
  jwtRefreshSecret: readEnv("JWT_REFRESH_SECRET", "refresh-secret-dev"),
  jwtAccessExpiresIn: readEnv("JWT_ACCESS_EXPIRES_IN", "15m"),
  jwtRefreshExpiresIn: readEnv("JWT_REFRESH_EXPIRES_IN", "7d"),
  googleClientId: readEnv("GOOGLE_CLIENT_ID"),
  openRouterApiKey: readEnv("OPENROUTER_API_KEY"),
  openRouterModel: readEnv("OPENROUTER_MODEL", "openrouter/free"),
  openRouterBaseUrl: readEnv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
  openRouterSiteName: readEnv("OPENROUTER_SITE_NAME", "Ramein BE"),
  midtransServerKey: readEnv("MIDTRANS_SERVER_KEY"),
  midtransClientKey: readEnv("MIDTRANS_CLIENT_KEY"),
  midtransIsProduction: readEnv("MIDTRANS_IS_PRODUCTION", "false").toLowerCase() === "true",
  midtransNotificationUrl: readEnv("MIDTRANS_NOTIFICATION_URL")
};

export default env;
