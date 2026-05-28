import bcrypt from "bcryptjs";
import { query } from "../../src/db/mysql.js";
import { generateId } from "../../src/utils/id.js";

async function createUser({ name, email, password = "password123", role = "user", phone = null, isActive = true }) {
  const hashed = await bcrypt.hash(password, 10);
  const id = generateId();
  await query(
    "INSERT INTO users (id, name, email, password, phone, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, name, email.toLowerCase(), hashed, phone, role, isActive ? 1 : 0]
  );

  return {
    id,
    name,
    email: email.toLowerCase(),
    role
  };
}

async function createCategory(name) {
  const id = generateId();
  await query("INSERT INTO categories (id, name, is_active) VALUES (?, ?, 1)", [id, name]);
  return id;
}

async function createCity(name, provinsi = null) {
  const id = generateId();
  await query("INSERT INTO cities (id, name, provinsi, is_active) VALUES (?, ?, ?, 1)", [id, name, provinsi]);
  return id;
}

async function createOrganizer({ name, description = null, contactName = null, contactEmail = null, contactPhone = null }) {
  const id = generateId();
  await query(
    "INSERT INTO organizers (id, name, description, contact_name, contact_email, contact_phone, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
    [id, name, description, contactName, contactEmail, contactPhone]
  );
  return id;
}

async function getEventTickets(eventId) {
  return query("SELECT * FROM event_ticket_types WHERE event_id = ? ORDER BY created_at ASC, id ASC", [eventId]);
}

async function getEventById(eventId) {
  const rows = await query("SELECT * FROM events WHERE id = ? LIMIT 1", [eventId]);
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
