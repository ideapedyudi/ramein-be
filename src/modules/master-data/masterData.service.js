import { query } from "../../db/mysql.js";
import ApiError from "../../utils/apiError.js";
import { generateId } from "../../utils/id.js";

const tableMap = {
  categories: "categories",
  cities: "cities",
  organizers: "organizers"
};

function getTable(resource) {
  const table = tableMap[resource];
  if (!table) throw new ApiError(400, "Invalid master data resource");
  return table;
}

function normalizeMasterRow(resource, row) {
  const base = {
    id: row.id,
    name: row.name,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  if (resource === "organizers") {
    return {
      ...base,
      description: row.description,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone
    };
  }

  if (resource === "cities") {
    return {
      ...base,
      provinsi: row.provinsi
    };
  }

  return base;
}

async function list(resource) {
  const table = getTable(resource);
  const rows = await query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
  return rows.map((row) => normalizeMasterRow(resource, row));
}

async function detail(resource, id) {
  const table = getTable(resource);
  const rows = await query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]);
  if (rows.length === 0) throw new ApiError(404, "Data not found");

  return normalizeMasterRow(resource, rows[0]);
}

async function create(resource, payload) {
  const table = getTable(resource);

  if (resource === "categories") {
    const id = generateId();
    await query(`INSERT INTO ${table} (id, name, is_active) VALUES (?, ?, 1)`, [id, payload.name]);
    const rows = await query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]);
    return normalizeMasterRow(resource, rows[0]);
  }

  if (resource === "cities") {
    const id = generateId();
    await query("INSERT INTO cities (id, name, provinsi, is_active) VALUES (?, ?, ?, 1)", [
      id,
      payload.name,
      payload.provinsi || null
    ]);
    const rows = await query("SELECT * FROM cities WHERE id = ? LIMIT 1", [id]);
    return normalizeMasterRow(resource, rows[0]);
  }

  const id = generateId();
  await query(
    "INSERT INTO organizers (id, name, description, contact_name, contact_email, contact_phone, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
    [
      id,
      payload.name,
      payload.description || null,
      payload.contactName || null,
      payload.contactEmail || null,
      payload.contactPhone || null
    ]
  );
  const rows = await query("SELECT * FROM organizers WHERE id = ? LIMIT 1", [id]);
  return normalizeMasterRow(resource, rows[0]);
}

function buildUpdate(resource, payload) {
  const fields = [];
  const values = [];

  if (payload.name !== undefined) {
    fields.push("name = ?");
    values.push(payload.name);
  }

  if (payload.isActive !== undefined) {
    fields.push("is_active = ?");
    values.push(payload.isActive ? 1 : 0);
  }

  if (resource === "cities" && payload.provinsi !== undefined) {
    fields.push("provinsi = ?");
    values.push(payload.provinsi);
  }

  if (resource === "organizers") {
    if (payload.description !== undefined) {
      fields.push("description = ?");
      values.push(payload.description);
    }
    if (payload.contactName !== undefined) {
      fields.push("contact_name = ?");
      values.push(payload.contactName);
    }
    if (payload.contactEmail !== undefined) {
      fields.push("contact_email = ?");
      values.push(payload.contactEmail);
    }
    if (payload.contactPhone !== undefined) {
      fields.push("contact_phone = ?");
      values.push(payload.contactPhone);
    }
  }

  return { fields, values };
}

async function update(resource, id, payload) {
  const table = getTable(resource);
  const { fields, values } = buildUpdate(resource, payload);

  if (fields.length > 0) {
    await query(`UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`, [...values, id]);
  }

  const rows = await query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]);
  if (rows.length === 0) throw new ApiError(404, "Data not found");

  return normalizeMasterRow(resource, rows[0]);
}

async function remove(resource, id) {
  const table = getTable(resource);
  await query(`UPDATE ${table} SET is_active = 0 WHERE id = ?`, [id]);

  const rows = await query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]);
  if (rows.length === 0) throw new ApiError(404, "Data not found");

  return normalizeMasterRow(resource, rows[0]);
}

export default {
  list,
  detail,
  create,
  update,
  remove
};
