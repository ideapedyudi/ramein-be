import { query } from "../../db/mysql.js";
import ApiError from "../../utils/apiError.js";

const tableMap = {
  categories: "categories",
  cities: "cities",
  venues: "venues",
  organizers: "organizers"
};

function getTable(resource) {
  const table = tableMap[resource];
  if (!table) throw new ApiError(400, "Invalid master data resource");
  return table;
}

function normalizeMasterRow(resource, row) {
  const base = {
    _id: row.id,
    id: row.id,
    name: row.name,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  if (resource === "venues") {
    return {
      ...base,
      cityId: row.city_id,
      address: row.address
    };
  }

  if (resource === "organizers") {
    return {
      ...base,
      description: row.description,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone
    };
  }

  return base;
}

async function list(resource) {
  const table = getTable(resource);
  const rows = await query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
  return rows.map((row) => normalizeMasterRow(resource, row));
}

async function create(resource, payload) {
  const table = getTable(resource);

  if (resource === "categories" || resource === "cities") {
    const result = await query(`INSERT INTO ${table} (name, is_active) VALUES (?, 1)`, [payload.name]);
    const rows = await query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [result.insertId]);
    return normalizeMasterRow(resource, rows[0]);
  }

  if (resource === "venues") {
    const result = await query(
      "INSERT INTO venues (name, city_id, address, is_active) VALUES (?, ?, ?, 1)",
      [payload.name, Number(payload.cityId), payload.address]
    );
    const rows = await query("SELECT * FROM venues WHERE id = ? LIMIT 1", [result.insertId]);
    return normalizeMasterRow(resource, rows[0]);
  }

  const result = await query(
    "INSERT INTO organizers (name, description, contact_name, contact_email, contact_phone, is_active) VALUES (?, ?, ?, ?, ?, 1)",
    [
      payload.name,
      payload.description || null,
      payload.contactName || null,
      payload.contactEmail || null,
      payload.contactPhone || null
    ]
  );
  const rows = await query("SELECT * FROM organizers WHERE id = ? LIMIT 1", [result.insertId]);
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

  if (resource === "venues") {
    if (payload.cityId !== undefined) {
      fields.push("city_id = ?");
      values.push(Number(payload.cityId));
    }
    if (payload.address !== undefined) {
      fields.push("address = ?");
      values.push(payload.address);
    }
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
    await query(`UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`, [...values, Number(id)]);
  }

  const rows = await query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [Number(id)]);
  if (rows.length === 0) throw new ApiError(404, "Data not found");

  return normalizeMasterRow(resource, rows[0]);
}

async function remove(resource, id) {
  const table = getTable(resource);
  await query(`UPDATE ${table} SET is_active = 0 WHERE id = ?`, [Number(id)]);

  const rows = await query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [Number(id)]);
  if (rows.length === 0) throw new ApiError(404, "Data not found");

  return normalizeMasterRow(resource, rows[0]);
}

export default {
  list,
  create,
  update,
  remove
};
