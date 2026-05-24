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

  const venueColumn = await query(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'events' AND COLUMN_NAME = 'venue_id'
     LIMIT 1`,
    [env.mysqlDatabase]
  );

  if (venueColumn.length > 0) {
    const constraints = await query(
      `SELECT CONSTRAINT_NAME AS constraintName
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'events'
         AND COLUMN_NAME = 'venue_id'
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [env.mysqlDatabase]
    );

    for (const constraint of constraints) {
      await query(`ALTER TABLE events DROP FOREIGN KEY \`${constraint.constraintName}\``);
    }

    await query("ALTER TABLE events DROP COLUMN venue_id");
  }

  const venuesTable = await query(
    `SELECT 1
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'venues'
     LIMIT 1`,
    [env.mysqlDatabase]
  );

  if (venuesTable.length > 0) {
    await query("DROP TABLE venues");
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
