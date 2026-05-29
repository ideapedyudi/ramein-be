import { query, transaction } from "../../db/mysql.js";
import ApiError from "../../utils/apiError.js";
import { generateId } from "../../utils/id.js";

function normalizeEventRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category_id: row.category_id,
    organizer_id: row.organizer_id,
    created_by: row.created_by,
    city_id: row.city_id,
    address_detail: row.address_detail,
    banner: row.banner,
    event_type: row.event_type,
    label_online: row.label_online,
    url_online: row.url_online,
    payment_type: row.payment_type,
    visibility: row.visibility,
    start_datetime: row.start_datetime,
    end_datetime: row.end_datetime,
    status: row.status,
    is_published: Boolean(row.is_published),
    is_withdraw: Boolean(row.is_withdraw),
    published_by: row.published_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    category: {
      id: row.category_id,
      name: row.category_name
    },
    city: {
      id: row.city_id,
      name: row.city_name,
      provinsi: row.city_provinsi
    },
    organizer: {
      id: row.organizer_id,
      name: row.organizer_name,
      contact_name: row.organizer_contact_name,
      contact_email: row.organizer_contact_email,
      contact_phone: row.organizer_contact_phone
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

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function formatDateToMysqlDateTime(date) {
  return `${date.getUTCFullYear()}-${padDatePart(date.getUTCMonth() + 1)}-${padDatePart(date.getUTCDate())} ${padDatePart(date.getUTCHours())}:${padDatePart(date.getUTCMinutes())}:${padDatePart(date.getUTCSeconds())}`;
}

function normalizeDateTimeValue(value, fieldName) {
  if (value === undefined || value === null || value === "") return value;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new ApiError(400, `Invalid ${fieldName}`);
    }
    return formatDateToMysqlDateTime(value);
  }

  const stringValue = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(stringValue)) {
    return stringValue;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    return `${stringValue} 00:00:00`;
  }

  const parsed = new Date(stringValue);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }

  return formatDateToMysqlDateTime(parsed);
}

function normalizeEventDatePayload(payload) {
  const normalized = { ...payload };

  const startDateTime = getPayloadValue(payload, "startDateTime", "start_datetime");
  if (startDateTime !== undefined) {
    const value = normalizeDateTimeValue(startDateTime, "startDateTime");
    normalized.startDateTime = value;
    normalized.start_datetime = value;
  }

  const endDateTime = getPayloadValue(payload, "endDateTime", "end_datetime");
  if (endDateTime !== undefined) {
    const value = normalizeDateTimeValue(endDateTime, "endDateTime");
    normalized.endDateTime = value;
    normalized.end_datetime = value;
  }

  if (Array.isArray(payload.ticketTypes)) {
    normalized.ticketTypes = payload.ticketTypes.map((ticket, index) => {
      const saleStartAt = getPayloadValue(ticket, "saleStartAt", "sale_start_at");
      const saleEndAt = getPayloadValue(ticket, "saleEndAt", "sale_end_at");

      return {
        ...ticket,
        saleStartAt:
          saleStartAt === undefined
            ? saleStartAt
            : normalizeDateTimeValue(saleStartAt, `ticketTypes[${index}].saleStartAt`),
        saleEndAt:
          saleEndAt === undefined
            ? saleEndAt
            : normalizeDateTimeValue(saleEndAt, `ticketTypes[${index}].saleEndAt`)
      };
    });
  }

  return normalized;
}

function getFirstQueryValue(queryParams, keys) {
  for (const key of keys) {
    const value = queryParams[key];
    if (Array.isArray(value) && value.length > 0) return value[0];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function getQueryList(queryParams, keys) {
  const values = [];

  for (const key of keys) {
    const value = queryParams[key];
    if (Array.isArray(value)) {
      values.push(...value);
      continue;
    }
    if (value !== undefined && value !== null && value !== "") {
      values.push(value);
    }
  }

  return values
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeTicketRow(row) {
  return {
    id: row.id,
    event_id: row.event_id,
    name: row.name,
    price: Number(row.price),
    quota: Number(row.quota),
    sold: Number(row.sold),
    sale_start_at: row.sale_start_at,
    sale_end_at: row.sale_end_at,
    created_at: row.created_at,
    updated_at: row.updated_at
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
    const list = ticketMap.get(normalized.event_id) || [];
    list.push(normalized);
    ticketMap.set(normalized.event_id, list);
  }

  return events.map((event) => ({
    ...event,
    ticket_types: ticketMap.get(event.id) || []
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
      ci.provinsi AS city_provinsi,
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

function applyCreatedByFilter(queryParams, user, clauses, values) {
  const createdBy = getPayloadValue(queryParams, "createdBy", "created_by");
  if (!createdBy) return;

  if (createdBy === "me") {
    if (!user) throw new ApiError(401, "Unauthorized");
    clauses.push("e.created_by = ?");
    values.push(user.id);
    return;
  }

  clauses.push("e.created_by = ?");
  values.push(createdBy);
}

async function listEvents(queryParams, user = null) {
  const { clauses, values } = buildEventWhere(queryParams);
  applyCreatedByFilter(queryParams, user, clauses, values);
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

async function listExploreEvents(queryParams = {}) {
  const clauses = ["e.visibility = 'public'"];
  const values = [];

  const search = getFirstQueryValue(queryParams, ["search", "q"]);
  if (search) {
    clauses.push("(e.title LIKE ? OR e.description LIKE ?)");
    const like = `%${search}%`;
    values.push(like, like);
  }

  const category = getFirstQueryValue(queryParams, ["category", "kategory", "categoryName", "category_name"]);
  if (category) {
    clauses.push("LOWER(c.name) = LOWER(?)");
    values.push(category);
  }

  const categoryId = getFirstQueryValue(queryParams, ["categoryId", "category_id"]);
  if (categoryId) {
    clauses.push("e.category_id = ?");
    values.push(categoryId);
  }

  const wilayah = getFirstQueryValue(queryParams, ["wilayah", "provinsi", "province", "region"]);
  if (wilayah) {
    clauses.push("ci.provinsi LIKE ?");
    values.push(`%${wilayah}%`);
  }

  const kota = getFirstQueryValue(queryParams, ["kota", "city", "cityName", "city_name"]);
  if (kota) {
    clauses.push("ci.name LIKE ?");
    values.push(`%${kota}%`);
  }

  const cityId = getFirstQueryValue(queryParams, ["cityId", "city_id"]);
  if (cityId) {
    clauses.push("e.city_id = ?");
    values.push(cityId);
  }

  const eventDate = getFirstQueryValue(queryParams, ["date", "eventDate", "event_date", "startDate", "start_date"]);
  if (eventDate) {
    clauses.push("DATE(e.start_datetime) = ?");
    values.push(eventDate);
  }

  return fetchEvents({
    whereClauses: clauses,
    values,
    orderBy: "e.start_datetime ASC"
  });
}

async function listPurchasedEvents(userId) {
  const rows = await query(
    `SELECT
      t.id AS transaction_id,
      t.order_id,
      t.gross_amount,
      t.admin_income,
      t.status AS transaction_status,
      t.paid_at,
      t.created_at AS transaction_created_at,
      e.*,
      c.name AS category_name,
      ci.name AS city_name,
      ci.provinsi AS city_provinsi,
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
        purchase_summary: {
          transaction_count: 1,
          total_tickets: totalTickets,
          total_spent: Number(row.gross_amount),
          latest_paid_at: row.paid_at,
          latest_transaction_at: row.transaction_created_at
        },
        latest_transaction: {
          id: row.transaction_id,
          order_id: row.order_id,
          gross_amount: Number(row.gross_amount),
          admin_income: Number(row.admin_income || 0),
          status: row.transaction_status,
          paid_at: row.paid_at,
          created_at: row.transaction_created_at
        }
      });
      continue;
    }

    existing.purchase_summary.transaction_count += 1;
    existing.purchase_summary.total_tickets += totalTickets;
    existing.purchase_summary.total_spent += Number(row.gross_amount);
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
    whereClauses: ["e.visibility = 'public'", "e.category_id = ?"],
    values: [categoryId],
    orderBy: "e.created_at DESC",
    limit: 5
  });
}

async function listInterestEvents(queryParams = {}) {
  const categories = getQueryList(queryParams, ["categories", "category", "kategory", "interest", "interests"]);

  if (categories.length === 0) {
    return [];
  }

  const placeholders = categories.map(() => "?").join(", ");
  return fetchEvents({
    whereClauses: ["e.visibility = 'public'", `LOWER(c.name) IN (${placeholders})`],
    values: categories.map((category) => category.toLowerCase()),
    orderBy: "e.created_at DESC"
  });
}

async function createEvent(payload, user) {
  const normalizedPayload = normalizeEventDatePayload(payload);
  const organizerRows = await query(
    "SELECT id, is_active FROM organizers WHERE id = ? LIMIT 1",
    [normalizedPayload.organizerId]
  );
  const organizer = organizerRows[0];
  if (!organizer || !organizer.is_active) {
    throw new ApiError(400, "Invalid organizer");
  }

  const eventId = generateId();
  const eventType = getPayloadValue(normalizedPayload, "eventType", "event_type");
  const labelOnline = getPayloadValue(normalizedPayload, "labelOnline", "label_online");
  const urlOnline = getPayloadValue(normalizedPayload, "urlOnline", "url_online");
  const paymentType = getPayloadValue(normalizedPayload, "paymentType", "payment_type") || "paid";
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 1, ?)`,
      [
        eventId,
        normalizedPayload.title,
        normalizedPayload.description,
        normalizedPayload.categoryId,
        normalizedPayload.organizerId,
        user.id,
        normalizedPayload.cityId,
        normalizedPayload.addressDetail,
        normalizedPayload.banner || null,
        eventType || null,
        labelOnline || null,
        urlOnline || null,
        paymentType,
        visibility,
        normalizedPayload.startDateTime,
        normalizedPayload.endDateTime,
        user.role
      ]
    );

    for (const ticket of normalizedPayload.ticketTypes || []) {
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
  return user.role === "admin" || event.created_by === user.id;
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

  return { fields, values };
}

async function updateEvent(id, payload, user) {
  const normalizedPayload = normalizeEventDatePayload(payload);
  const existing = await getEventById(id);
  if (!canManageEvent(existing, user)) throw new ApiError(403, "Forbidden");

  if (normalizedPayload.organizerId !== undefined) {
    const organizerRows = await query(
      "SELECT id, is_active FROM organizers WHERE id = ? LIMIT 1",
      [normalizedPayload.organizerId]
    );
    const organizer = organizerRows[0];
    if (!organizer || !organizer.is_active) {
      throw new ApiError(400, "Invalid organizer");
    }
  }

  const { fields, values } = buildEventUpdate(normalizedPayload, user);

  await transaction(async (connection) => {
    if (fields.length > 0) {
      await connection.execute(`UPDATE events SET ${fields.join(", ")} WHERE id = ?`, [...values, id]);
    }

    if (normalizedPayload.ticketTypes !== undefined) {
      await connection.execute("DELETE FROM event_ticket_types WHERE event_id = ?", [id]);
      for (const ticket of normalizedPayload.ticketTypes) {
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

export default {
  listEvents,
  listMyEvents,
  listPurchasedEvents,
  getEventById,
  listTrendingEvents,
  listExploreEvents,
  listRecommendedEvents,
  listInterestEvents,
  createEvent,
  updateEvent,
  deleteEvent
};
