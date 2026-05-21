import fs from "fs/promises";
import mysql from "mysql2/promise";
import env from "../config/env.js";
import { query, closePool } from "../db/mysql.js";

async function ensureDatabase() {
  const connection = await mysql.createConnection({
    host: env.mysqlHost,
    port: env.mysqlPort,
    user: env.mysqlUser,
    password: env.mysqlPassword
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.mysqlDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();
}

async function run() {
  await ensureDatabase();

  const schemaPath = new URL("../db/schema.sql", import.meta.url);
  const schemaSql = await fs.readFile(schemaPath, "utf8");
  const statements = schemaSql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    await query(statement);
  }

  await closePool();
  // eslint-disable-next-line no-console
  console.log("Database initialized successfully");
}

run().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to initialize database", error);
  await closePool();
  process.exit(1);
});
