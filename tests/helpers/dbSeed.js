import bcrypt from "bcryptjs";
import { query } from "../../src/db/mysql.js";

async function createUser({ name, email, password = "password123", role = "user", phone = null, isActive = true }) {
  const hashed = await bcrypt.hash(password, 10);
  const result = await query(
    "INSERT INTO users (name, email, password, phone, role, is_active) VALUES (?, ?, ?, ?, ?, ?)",
    [name, email.toLowerCase(), hashed, phone, role, isActive ? 1 : 0]
  );

  return {
    _id: result.insertId,
    id: result.insertId,
    name,
    email: email.toLowerCase(),
    role
  };
}

async function createCategory(name) {
  const result = await query("INSERT INTO categories (name, is_active) VALUES (?, 1)", [name]);
  return result.insertId;
}

async function createCity(name) {
  const result = await query("INSERT INTO cities (name, is_active) VALUES (?, 1)", [name]);
  return result.insertId;
}

async function createOrganizer({ name, description = null, contactName = null, contactEmail = null, contactPhone = null }) {
  const result = await query(
    "INSERT INTO organizers (name, description, contact_name, contact_email, contact_phone, is_active) VALUES (?, ?, ?, ?, ?, 1)",
    [name, description, contactName, contactEmail, contactPhone]
  );
  return result.insertId;
}

async function getEventTickets(eventId) {
  return query("SELECT * FROM event_ticket_types WHERE event_id = ? ORDER BY id ASC", [Number(eventId)]);
}

async function getEventById(eventId) {
  const rows = await query("SELECT * FROM events WHERE id = ? LIMIT 1", [Number(eventId)]);
  return rows[0] || null;
}

export {
  createUser,
  createCategory,
  createCity,
  createOrganizer,
  getEventTickets,
  getEventById
};
