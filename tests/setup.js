import fs from "fs/promises";
import mysql from "mysql2/promise";
import { jest } from "@jest/globals";
import env from "../src/config/env.js";
import { query, closePool } from "../src/db/mysql.js";

jest.setTimeout(30000);

const tables = [
  "transaction_items",
  "payment_logs",
  "transactions",
  "event_ticket_types",
  "events",
  "venues",
  "organizers",
  "cities",
  "categories",
  "users"
];

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

async function runSchema() {
  const schemaPath = new URL("../src/db/schema.sql", import.meta.url);
  const schemaSql = await fs.readFile(schemaPath, "utf8");
  const statements = schemaSql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    await query(statement);
  }
}

beforeAll(async () => {
  await ensureDatabase();
  await runSchema();
});

afterEach(async () => {
  await query("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of tables) {
    await query(`TRUNCATE TABLE ${table}`);
  }
  await query("SET FOREIGN_KEY_CHECKS = 1");
});

afterAll(async () => {
  await closePool();
});
