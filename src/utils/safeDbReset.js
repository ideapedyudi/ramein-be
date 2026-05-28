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

  if (!isSafeResetDatabase(normalizedDatabaseName)) {
    throw new Error(
      `[${purpose}] Refusing to reset database "${databaseName}". Only databases ending with "_dev" or "_test" may be reset by repo scripts.`
    );
  }

  if (normalizedNodeEnv === "production") {
    throw new Error(`[${purpose}] Refusing to reset database while NODE_ENV=production.`);
  }
}

export {
  assertSafeDbReset,
  isSafeResetDatabase
};
