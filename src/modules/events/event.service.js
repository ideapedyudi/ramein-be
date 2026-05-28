import { query, transaction } from "../../db/mysql.js";
import ApiError from "../../utils/apiError.js";
import { generateId } from "../../utils/id.js";

function normalizeEventRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    organizerId: row.organizer_id,
    createdBy: row.created_by,
    cityId: row.city_id,
    addressDetail: row.address_detail,
    banner: row.banner,
    eventType: row.event_type,
    event_type: row.event_type,
    labelOnline: row.label_online,
    label_online: row.label_online,
    urlOnline: row.url_online,
    url_online: row.url_online,
    paymentType: row.payment_type,
    payment_type: row.payment_type,
    visibility: row.visibility,
    startDateTime: row.start_datetime,
    start_datetime: row.start_datetime,
    endDateTime: row.end_datetime,
    end_datetime: row.end_datetime,
    status: row.status,
    isPublished: Boolean(row.is_published),
    is_published: Boolean(row.is_published),
    publishedBy: row.published_by,
    published_by: row.published_by,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
    category: {
      id: row.category_id,
      name: row.category_name
    },
    city: {
      id: row.city_id,
      name: row.city_name
    },
    organizer: {
      id: row.organizer_id,
      name: row.organizer_name,
      contactName: row.organizer_contact_name,
      contactEmail: row.organizer_contact_email,
      contactPhone: row.organizer_contact_phone
    },
    creator: {
      id: row.created_by,
      name: row.creator_name,
      email: row.creator_email
    }
  };
}

function getPayloadValue(payload, camelKey, snakeKey) {
  if (payload[camelKey] !== undefined) return payload[camelKey];
  return payload[snakeKey];
}

function normalizeTicketRow(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    price: Number(row.price),
    quota: Number(row.quota),
    sold: Number(row.sold),
    saleStartAt: row.sale_start_at,
    saleEndAt: row.sale_end_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function attachTicketTypes(events) {
  if (events.length === 0) return events;

  const eventIds = events.map((event) => event.id);
  const placeholders = eventIds.map(() => "?").join(", ");
  const ticketRows = await query(
    `SELECT * FROM event_ticket_types WHERE event_id IN (${placeholders}) ORDER BY created_at ASC, id ASC`,
    eventIds
  );

  const ticketMap = new Map();
  for (const ticket of ticketRows) {
    const normalized = normalizeTicketRow(ticket);
    const list = ticketMap.get(normalized.eventId) || [];
    list.push(normalized);
    ticketMap.set(normalized.eventId, list);
  }

  return events.map((event) => ({
    ...event,
    ticketTypes: ticketMap.get(event.id) || []
  }));
}

async function fetchEvents({ whereClauses = [], values = [], orderBy = "e.start_datetime ASC", limit = null } = {}) {
  const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const limitClause = limit ? "LIMIT ?" : "";
  const sqlValues = limit ? [...values, limit] : values;

  const rows = await query(
    `SELECT
      e.*,
      c.name AS category_name,
      ci.name AS city_name,
      o.name AS organizer_name,
      o.contact_name AS organizer_contact_name,
      o.contact_email AS organizer_contact_email,
      o.contact_phone AS organizer_contact_phone,
      u.name AS creator_name,
      u.email AS creator_email
    FROM events e
    JOIN categories c ON c.id = e.category_id
    JOIN cities ci ON ci.id = e.city_id
    JOIN organizers o ON o.id = e.organizer_id
    JOIN users u ON u.id = e.created_by
    ${where}
    ORDER BY ${orderBy}
    ${limitClause}`,
    sqlValues
  );

  const events = rows.map(normalizeEventRow);
  return attachTicketTypes(events);
}

function buildEventWhere(queryParams) {
  const clauses = [];
  const values = [];

  if (queryParams.status) {
    clauses.push("e.status = ?");
    values.push(queryParams.status);
  }

  if (queryParams.organizerId) {
    clauses.push("e.organizer_id = ?");
    values.push(queryParams.organizerId);
  }

  if (queryParams.search) {
    clauses.push("(e.title LIKE ? OR e.description LIKE ?)");
    const like = `%${queryParams.search}%`;
    values.push(like, like);
  }

  return {
    clauses,
    values
  };
}

async function listEvents(queryParams) {
  const { clauses, values } = buildEventWhere(queryParams);
  return fetchEvents({
    whereClauses: clauses,
    values,
    orderBy: "e.start_datetime ASC"
  });
}

async function listMyEvents(queryParams, user) {
  const { clauses, values } = buildEventWhere(queryParams);
  clauses.push("e.created_by = ?");
  values.push(user.id);
  return fetchEvents({
    whereClauses: clauses,
    values,
    orderBy: "e.start_datetime ASC"
  });
}

async function getEventById(id) {
  const rows = await fetchEvents({
    whereClauses: ["e.id = ?"],
    values: [id],
    limit: 1
  });

  if (rows.length === 0) throw new ApiError(404, "Event not found");
  return rows[0];
}

async function listTrendingEvents() {
  return fetchEvents({
    whereClauses: ["e.visibility = 'public'"],
    orderBy: "e.created_at DESC, e.id DESC",
    limit: 8
  });
}

async function listPurchasedEvents(userId) {
  const rows = await query(
    `SELECT
      t.id AS transaction_id,
      t.order_id,
      t.gross_amount,
      t.status AS transaction_status,
      t.paid_at,
      t.created_at AS transaction_created_at,
      e.*,
      c.name AS category_name,
      ci.name AS city_name,
      o.name AS organizer_name,
      o.contact_name AS organizer_contact_name,
      o.contact_email AS organizer_contact_email,
      o.contact_phone AS organizer_contact_phone,
      u.name AS creator_name,
      u.email AS creator_email
    FROM transactions t
    JOIN events e ON e.id = t.event_id
    JOIN categories c ON c.id = e.category_id
    JOIN cities ci ON ci.id = e.city_id
    JOIN organizers o ON o.id = e.organizer_id
    JOIN users u ON u.id = e.created_by
    WHERE t.user_id = ? AND t.status = 'paid'
    ORDER BY t.paid_at DESC, t.created_at DESC`,
    [userId]
  );

  if (rows.length === 0) {
    return [];
  }

  const transactionIds = rows.map((row) => row.transaction_id);
  const placeholders = transactionIds.map(() => "?").join(", ");
  const itemRows = await query(
    `SELECT transaction_id, quantity FROM transaction_items WHERE transaction_id IN (${placeholders})`,
    transactionIds
  );

  const ticketCountByTransactionId = new Map();
  for (const row of itemRows) {
    const currentTotal = ticketCountByTransactionId.get(row.transaction_id) || 0;
    ticketCountByTransactionId.set(row.transaction_id, currentTotal + Number(row.quantity));
  }

  const purchasedEventMap = new Map();

  for (const row of rows) {
    const existing = purchasedEventMap.get(row.event_id);
    const totalTickets = ticketCountByTransactionId.get(row.transaction_id) || 0;

    if (!existing) {
      purchasedEventMap.set(row.event_id, {
        event: normalizeEventRow(row),
        purchaseSummary: {
          transactionCount: 1,
          totalTickets,
          totalSpent: Number(row.gross_amount),
          latestPaidAt: row.paid_at,
          latestTransactionAt: row.transaction_created_at
        },
        latestTransaction: {
          id: row.transaction_id,
          orderId: row.order_id,
          grossAmount: Number(row.gross_amount),
          status: row.transaction_status,
          paidAt: row.paid_at,
          createdAt: row.transaction_created_at
        }
      });
      continue;
    }

    existing.purchaseSummary.transactionCount += 1;
    existing.purchaseSummary.totalTickets += totalTickets;
    existing.purchaseSummary.totalSpent += Number(row.gross_amount);
  }

  return Array.from(purchasedEventMap.values());
}

async function getCategoryIdByName(categoryName) {
  const rows = await query(
    "SELECT id FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1",
    [categoryName]
  );

  return rows[0]?.id || null;
}

async function listRecommendedEvents(queryParams = {}) {
  const categoryName = queryParams.interest || queryParams.category || "Konser";
  const categoryId = await getCategoryIdByName(categoryName);

  if (!categoryId) {
    return [];
  }

  return fetchEvents({
    whereClauses: ["e.status = 'published'", "e.category_id = ?"],
    values: [categoryId],
    orderBy: "e.created_at DESC",
    limit: 5
  });
}

async function createEvent(payload, user) {
  const organizerRows = await query(
    "SELECT id, is_active FROM organizers WHERE id = ? LIMIT 1",
    [payload.organizerId]
  );
  const organizer = organizerRows[0];
  if (!organizer || !organizer.is_active) {
    throw new ApiError(400, "Invalid organizer");
  }

  const eventId = generateId();
  const eventType = getPayloadValue(payload, "eventType", "event_type");
  const labelOnline = getPayloadValue(payload, "labelOnline", "label_online");
  const urlOnline = getPayloadValue(payload, "urlOnline", "url_online");
  const paymentType = getPayloadValue(payload, "paymentType", "payment_type") || "paid";
  const visibility = user.role === "admin" ? "public" : "private";

  await transaction(async (connection) => {
    await connection.execute(
      `INSERT INTO events (
        id,
        title,
        description,
        category_id,
        organizer_id,
        created_by,
        city_id,
        address_detail,
        banner,
        event_type,
        label_online,
        url_online,
        payment_type,
        visibility,
        start_datetime,
        end_datetime,
        status,
        is_published,
        published_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
      [
        eventId,
        payload.title,
        payload.description,
        payload.categoryId,
        payload.organizerId,
        user.id,
        payload.cityId,
        payload.addressDetail,
        payload.banner || null,
        eventType || null,
        labelOnline || null,
        urlOnline || null,
        paymentType,
        visibility,
        payload.startDateTime,
        payload.endDateTime,
        user.role
      ]
    );

    for (const ticket of payload.ticketTypes || []) {
      const ticketTypeId = generateId();
      await connection.execute(
        `INSERT INTO event_ticket_types (
          id,
          event_id,
          name,
          price,
          quota,
          sold,
          sale_start_at,
          sale_end_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          ticketTypeId,
          eventId,
          ticket.name,
          ticket.price,
          ticket.quota,
          ticket.saleStartAt,
          ticket.saleEndAt
        ]
      );
    }
  });

  return getEventById(eventId);
}

function canManageEvent(event, user) {
  return user.role === "admin" || event.createdBy === user.id;
}

function buildEventUpdate(payload, user) {
  const fields = [];
  const values = [];

  const map = {
    title: "title",
    description: "description",
    categoryId: "category_id",
    organizerId: "organizer_id",
    cityId: "city_id",
    addressDetail: "address_detail",
    banner: "banner",
    eventType: "event_type",
    event_type: "event_type",
    labelOnline: "label_online",
    label_online: "label_online",
    urlOnline: "url_online",
    url_online: "url_online",
    paymentType: "payment_type",
    payment_type: "payment_type",
    startDateTime: "start_datetime",
    endDateTime: "end_datetime",
    status: "status",
    isPublished: "is_published"
  };

  for (const [key, column] of Object.entries(map)) {
    if (payload[key] !== undefined) {
      fields.push(`${column} = ?`);
      if (key === "isPublished") {
        values.push(payload[key] ? 1 : 0);
      } else {
        values.push(payload[key]);
      }
    }
  }

  if (user.role !== "admin") {
    fields.push("status = 'pending'");
    fields.push("is_published = 0");
  }

  return { fields, values };
}

async function updateEvent(id, payload, user) {
  const existing = await getEventById(id);
  if (!canManageEvent(existing, user)) throw new ApiError(403, "Forbidden");

  if (payload.organizerId !== undefined) {
    const organizerRows = await query(
      "SELECT id, is_active FROM organizers WHERE id = ? LIMIT 1",
      [payload.organizerId]
    );
    const organizer = organizerRows[0];
    if (!organizer || !organizer.is_active) {
      throw new ApiError(400, "Invalid organizer");
    }
  }

  const { fields, values } = buildEventUpdate(payload, user);

  await transaction(async (connection) => {
    if (fields.length > 0) {
      await connection.execute(`UPDATE events SET ${fields.join(", ")} WHERE id = ?`, [...values, id]);
    }

    if (payload.ticketTypes !== undefined) {
      await connection.execute("DELETE FROM event_ticket_types WHERE event_id = ?", [id]);
      for (const ticket of payload.ticketTypes) {
        const ticketTypeId = generateId();
        await connection.execute(
          `INSERT INTO event_ticket_types (
            id,
            event_id,
            name,
            price,
            quota,
            sold,
            sale_start_at,
            sale_end_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ticketTypeId,
            id,
            ticket.name,
            ticket.price,
            ticket.quota,
            ticket.sold || 0,
            ticket.saleStartAt,
            ticket.saleEndAt
          ]
        );
      }
    }
  });

  return getEventById(id);
}

async function deleteEvent(id, user) {
  const event = await getEventById(id);
  if (!canManageEvent(event, user)) throw new ApiError(403, "Forbidden");
  await query("DELETE FROM events WHERE id = ?", [id]);
}

async function publishEvent(id, user) {
  if (user.role !== "admin") throw new ApiError(403, "Forbidden");

  const result = await query("UPDATE events SET status = 'published', is_published = 1 WHERE id = ?", [id]);
  if (result.affectedRows === 0) throw new ApiError(404, "Event not found");

  return getEventById(id);
}

export default {
  listEvents,
  listMyEvents,
  listPurchasedEvents,
  getEventById,
  listTrendingEvents,
  listRecommendedEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent
};
