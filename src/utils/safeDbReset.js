const RESERVED_DATABASES = new Set([
  "mysql",
  "information_schema",
  "performance_schema",
  "sys"
]);

function normalizeDatabaseName(name) {
  return String(name || "").trim().toLowerCase();
}

function isSafeResetDatabase(databaseName) {
  const normalized = normalizeDatabaseName(databaseName);
  return normalized.endsWith("_test") || normalized.endsWith("_dev");
}

function assertSafeDbReset({ databaseName, nodeEnv, purpose }) {
  const normalizedDatabaseName = normalizeDatabaseName(databaseName);
  const normalizedNodeEnv = normalizeDatabaseName(nodeEnv);

  if (!normalizedDatabaseName) {
    throw new Error(`[${purpose}] MYSQL_DATABASE is empty. Refusing to reset database.`);
  }

  if (RESERVED_DATABASES.has(normalizedDatabaseName)) {
    throw new Error(`[${purpose}] Refusing to reset reserved MySQL database "${databaseName}".`);
  }

  if (purpose === "test-setup") {
    if (normalizedNodeEnv !== "test") {
      throw new Error(`[${purpose}] NODE_ENV must be "test" before resetting the database.`);
    }

    if (!isSafeResetDatabase(normalizedDatabaseName)) {
      throw new Error(
        `[${purpose}] MYSQL_DATABASE must end with "_test" for test resets. Current value: "${databaseName}".`
      );
    }

    return;
  }

  const resetConfirm = normalizeDatabaseName(process.env.DB_RESET_CONFIRM);
  const explicitConfirm = resetConfirm === "yes" || resetConfirm === "true";

  if (!isSafeResetDatabase(normalizedDatabaseName) && !explicitConfirm) {
    throw new Error(
      `[${purpose}] Resetting "${databaseName}" requires DB_RESET_CONFIRM=yes because the database name is not clearly a dev/test database.`
    );
  }

  if (normalizedNodeEnv === "production" && !explicitConfirm) {
    throw new Error(`[${purpose}] Refusing to reset database while NODE_ENV=production.`);
  }
}

export {
  assertSafeDbReset,
  isSafeResetDatabase
};
