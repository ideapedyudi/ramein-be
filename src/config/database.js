import { query, closePool } from "../db/mysql.js";

async function connectDatabase() {
  await query("SELECT 1");
}

async function disconnectDatabase() {
  await closePool();
}

export {
  connectDatabase,
  disconnectDatabase
};
