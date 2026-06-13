import { query } from "../../db/mysql.js";
import ApiError from "../../utils/apiError.js";

const DEFAULT_ORGANIZER_ID = "00000000-0000-0000-0000-000000000000";

function getCreatorEventColumn(column) {
  if (column === "organizer_id" || column === "created_by") {
    return column;
  }

  throw new ApiError(500, "Invalid creator event column");
}

function normalizeCreatorEvent(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    banner: row.banner,
    eventType: row.event_type,
    paymentType: row.payment_type,
    startDateTime: row.start_datetime,
    endDateTime: row.end_datetime,
    status: row.status,
    category: {
      id: row.category_id,
      name: row.category_name
    },
    city: {
      id: row.city_id,
      name: row.city_name,
      provinsi: row.city_provinsi
    },
    totalParticipants: Number(row.total_participants || 0)
  };
}

async function getCreatorEventStats(column, id) {
  const eventColumn = getCreatorEventColumn(column);
  const rows = await query(
    `SELECT
      COUNT(DISTINCT e.id) AS total_events,
      COALESCE(SUM(ett.sold), 0) AS total_participants
    FROM events e
    LEFT JOIN event_ticket_types ett ON ett.event_id = e.id
    WHERE e.${eventColumn} = ?`,
    [id]
  );

  return {
    totalEvents: Number(rows[0]?.total_events || 0),
    totalParticipants: Number(rows[0]?.total_participants || 0)
  };
}

async function getCreatorEvents(column, id) {
  const eventColumn = getCreatorEventColumn(column);
  const rows = await query(
    `SELECT
      e.id,
      e.title,
      e.description,
      e.banner,
      e.event_type,
      e.payment_type,
      e.start_datetime,
      e.end_datetime,
      e.status,
      e.category_id,
      e.city_id,
      c.name AS category_name,
      ci.name AS city_name,
      ci.provinsi AS city_provinsi,
      COALESCE(SUM(ett.sold), 0) AS total_participants
    FROM events e
    JOIN categories c ON c.id = e.category_id
    JOIN cities ci ON ci.id = e.city_id
    LEFT JOIN event_ticket_types ett ON ett.event_id = e.id
    WHERE e.${eventColumn} = ?
    GROUP BY
      e.id,
      e.title,
      e.description,
      e.banner,
      e.event_type,
      e.payment_type,
      e.start_datetime,
      e.end_datetime,
      e.status,
      e.category_id,
      e.city_id,
      c.name,
      ci.name,
      ci.provinsi
    ORDER BY e.start_datetime DESC, e.created_at DESC`,
    [id]
  );

  return rows.map(normalizeCreatorEvent);
}

function normalizeOrganizer(row, stats, events) {
  return {
    id: row.id,
    type: "organizer",
    name: row.name,
    bio: row.description,
    totalEvents: stats.totalEvents,
    totalParticipants: stats.totalParticipants,
    events
  };
}

function normalizeUser(row, stats, events) {
  return {
    id: row.id,
    type: "user",
    name: row.name,
    bio: null,
    totalEvents: stats.totalEvents,
    totalParticipants: stats.totalParticipants,
    events
  };
}

async function getCreatorById(id) {
  const organizerRows = await query(
    `SELECT id, name, description
    FROM organizers
    WHERE id = ? AND id <> ? AND is_active = 1
    LIMIT 1`,
    [id, DEFAULT_ORGANIZER_ID]
  );

  if (organizerRows.length > 0) {
    const stats = await getCreatorEventStats("organizer_id", id);
    const events = await getCreatorEvents("organizer_id", id);
    return normalizeOrganizer(organizerRows[0], stats, events);
  }

  const userRows = await query(
    `SELECT id, name
    FROM users
    WHERE id = ? AND is_active = 1
    LIMIT 1`,
    [id]
  );

  if (userRows.length > 0) {
    const stats = await getCreatorEventStats("created_by", id);
    const events = await getCreatorEvents("created_by", id);
    return normalizeUser(userRows[0], stats, events);
  }

  throw new ApiError(404, "Creator not found");
}

export default {
  getCreatorById
};
