import { query, transaction } from "../../db/mysql.js";
import ApiError from "../../utils/apiError.js";

const ticketSelect = `
  ep.*,
  u.name AS user_name,
  u.email AS user_email,
  e.title AS event_title,
  e.description AS event_description,
  e.banner AS event_banner,
  e.event_type AS event_type,
  e.label_online AS event_label_online,
  e.url_online AS event_url_online,
  e.payment_type AS event_payment_type,
  e.visibility AS event_visibility,
  e.start_datetime AS event_start_datetime,
  e.end_datetime AS event_end_datetime,
  e.status AS event_status,
  e.is_published AS event_is_published,
  e.created_by AS event_created_by,
  c.id AS category_id,
  c.name AS category_name,
  ci.id AS city_id,
  ci.name AS city_name,
  ci.provinsi AS city_provinsi,
  o.id AS organizer_id,
  o.name AS organizer_name,
  t.order_id,
  t.gross_amount,
  t.admin_income,
  t.status AS transaction_status,
  t.payment_provider,
  t.snap_token,
  t.redirect_url,
  t.midtrans_transaction_status,
  t.paid_at,
  t.created_at AS transaction_created_at,
  t.updated_at AS transaction_updated_at
`;

function mapTicketRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    transactionId: row.transaction_id,
    qrCode: row.qr_code,
    attendanceStatus: row.attendance_status,
    attendedAt: row.attended_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: row.user_name
      ? {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email
        }
      : undefined,
    event: row.event_title
      ? {
          id: row.event_id,
          title: row.event_title,
          description: row.event_description,
          banner: row.event_banner,
          eventType: row.event_type,
          labelOnline: row.event_label_online,
          urlOnline: row.event_url_online,
          paymentType: row.event_payment_type,
          visibility: row.event_visibility,
          startDateTime: row.event_start_datetime,
          endDateTime: row.event_end_datetime,
          status: row.event_status,
          isPublished: Boolean(row.event_is_published),
          createdBy: row.event_created_by,
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
            name: row.organizer_name
          }
        }
      : undefined,
    transaction: row.order_id
      ? {
          id: row.transaction_id,
          orderId: row.order_id,
          grossAmount: Number(row.gross_amount),
          adminIncome: Number(row.admin_income || 0),
          status: row.transaction_status,
          paymentProvider: row.payment_provider,
          snapToken: row.snap_token,
          redirectUrl: row.redirect_url,
          midtransTransactionStatus: row.midtrans_transaction_status,
          paidAt: row.paid_at,
          createdAt: row.transaction_created_at,
          updatedAt: row.transaction_updated_at
        }
      : undefined
  };
}

function mapTransactionItemRow(row) {
  return {
    ticketTypeId: row.ticket_type_id,
    ticketName: row.ticket_name,
    unitPrice: Number(row.unit_price),
    quantity: Number(row.quantity),
    subtotal: Number(row.subtotal)
  };
}

async function attachTransactionItems(ticketList) {
  if (ticketList.length === 0) return ticketList;

  const transactionIds = [...new Set(ticketList.map((item) => item.transactionId))];
  const placeholders = transactionIds.map(() => "?").join(", ");
  const rows = await query(
    `SELECT * FROM transaction_items WHERE transaction_id IN (${placeholders}) ORDER BY id ASC`,
    transactionIds
  );

  const itemMap = new Map();
  for (const row of rows) {
    const list = itemMap.get(row.transaction_id) || [];
    list.push(mapTransactionItemRow(row));
    itemMap.set(row.transaction_id, list);
  }

  return ticketList.map((item) => ({
    ...item,
    transaction: item.transaction
      ? {
          ...item.transaction,
          items: itemMap.get(item.transactionId) || []
        }
      : item.transaction
  }));
}

function mapTicketDetail(ticket) {
  return {
    id: ticket.id,
    qrCode: ticket.qrCode,
    attendanceStatus: ticket.attendanceStatus,
    attendedAt: ticket.attendedAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt
  };
}

function groupTicketsByTransaction(ticketList) {
  const transactionMap = new Map();

  for (const ticket of ticketList) {
    const existing = transactionMap.get(ticket.transactionId);

    if (!existing) {
      const quantity = ticket.transaction?.items?.reduce((total, item) => total + Number(item.quantity), 0) || 1;
      transactionMap.set(ticket.transactionId, {
        ...ticket,
        quantity,
        ticketCount: 1,
        unitPrice: ticket.transaction?.items?.[0]?.unitPrice ?? ticket.transaction?.grossAmount ?? 0,
        totalPrice: ticket.transaction?.grossAmount ?? 0,
        tickets: [mapTicketDetail(ticket)]
      });
      continue;
    }

    existing.ticketCount += 1;
    existing.tickets.push(mapTicketDetail(ticket));
  }

  return Array.from(transactionMap.values());
}

async function getMyTickets(userId) {
  const rows = await query(
    `SELECT
      ${ticketSelect}
    FROM ticket ep
    JOIN users u ON u.id = ep.user_id
    JOIN events e ON e.id = ep.event_id
    JOIN categories c ON c.id = e.category_id
    JOIN cities ci ON ci.id = e.city_id
    JOIN organizers o ON o.id = e.organizer_id
    JOIN transactions t ON t.id = ep.transaction_id
    WHERE ep.user_id = ?
    ORDER BY ep.created_at DESC`,
    [userId]
  );

  const tickets = await attachTransactionItems(rows.map(mapTicketRow));
  return groupTicketsByTransaction(tickets);
}

function normalizeAttendanceStatus(status) {
  if (!status || status === "all" || status === "null" || status === "undefined") {
    return null;
  }

  if (status === "attended" || status === "hadir") {
    return "attended";
  }

  if (
    status === "not_attended" ||
    status === "not-attended" ||
    status === "tidak_hadir" ||
    status === "tidak-hadir" ||
    status === "belum_hadir" ||
    status === "belum-hadir"
  ) {
    return "not_attended";
  }

  throw new ApiError(400, "Invalid attendance status");
}

function canAccessEventTickets(event, user) {
  return user.role === "admin" || event.created_by === user.id;
}

async function getEventTickets(eventId, status, user) {
  const eventRows = await query("SELECT id, created_by FROM events WHERE id = ? LIMIT 1", [eventId]);
  const event = eventRows[0];
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  if (!canAccessEventTickets(event, user)) {
    throw new ApiError(403, "You are not allowed to view tickets for this event");
  }

  const attendanceStatus = normalizeAttendanceStatus(status);
  const clauses = ["ep.event_id = ?"];
  const values = [eventId];

  if (attendanceStatus) {
    clauses.push("ep.attendance_status = ?");
    values.push(attendanceStatus);
  }

  const rows = await query(
    `SELECT
      ${ticketSelect}
    FROM ticket ep
    JOIN users u ON u.id = ep.user_id
    JOIN events e ON e.id = ep.event_id
    JOIN categories c ON c.id = e.category_id
    JOIN cities ci ON ci.id = e.city_id
    JOIN organizers o ON o.id = e.organizer_id
    JOIN transactions t ON t.id = ep.transaction_id
    WHERE ${clauses.join(" AND ")}
    ORDER BY ep.created_at DESC`,
    values
  );

  return attachTransactionItems(rows.map(mapTicketRow));
}

async function getByQrCode(qrCode) {
  const rows = await query(
    `SELECT
      ${ticketSelect}
    FROM ticket ep
    JOIN users u ON u.id = ep.user_id
    JOIN events e ON e.id = ep.event_id
    JOIN categories c ON c.id = e.category_id
    JOIN cities ci ON ci.id = e.city_id
    JOIN organizers o ON o.id = e.organizer_id
    JOIN transactions t ON t.id = ep.transaction_id
    WHERE ep.qr_code = ?
    LIMIT 1`,
    [qrCode]
  );

  return rows[0] ? mapTicketRow(rows[0]) : null;
}

function canScanTicket(ticket, user) {
  return user.role === "admin" || ticket.event?.createdBy === user.id;
}

async function scanQrCode(qrCode, user) {
  const existing = await getByQrCode(qrCode);
  if (!existing) {
    throw new ApiError(404, "QR code not found");
  }

  const isOnlineEvent = String(existing.event?.eventType || "")
    .toLowerCase()
    .trim() === "online";

  if (!isOnlineEvent && !canScanTicket(existing, user)) {
    throw new ApiError(403, "You are not allowed to scan this QR code");
  }

  if (existing.attendanceStatus === "attended") {
    return {
      ...existing,
      alreadyAttended: true
    };
  }

  return transaction(async (connection) => {
    await connection.execute(
      "UPDATE ticket SET attendance_status = 'attended', attended_at = UTC_TIMESTAMP() WHERE qr_code = ? AND attendance_status = 'not_attended'",
      [qrCode]
    );

    const [rows] = await connection.execute(
      `SELECT
        ${ticketSelect}
      FROM ticket ep
      JOIN users u ON u.id = ep.user_id
      JOIN events e ON e.id = ep.event_id
      JOIN categories c ON c.id = e.category_id
      JOIN cities ci ON ci.id = e.city_id
      JOIN organizers o ON o.id = e.organizer_id
      JOIN transactions t ON t.id = ep.transaction_id
      WHERE ep.qr_code = ?
      LIMIT 1`,
      [qrCode]
    );

    return {
      ...mapTicketRow(rows[0]),
      alreadyAttended: false
    };
  });
}

export default {
  getMyTickets,
  getEventTickets,
  getByQrCode,
  scanQrCode
};
