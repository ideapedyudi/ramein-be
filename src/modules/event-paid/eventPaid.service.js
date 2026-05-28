import { query, transaction } from "../../db/mysql.js";
import ApiError from "../../utils/apiError.js";

const eventPaidSelect = `
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
  t.status AS transaction_status,
  t.payment_provider,
  t.snap_token,
  t.redirect_url,
  t.midtrans_transaction_status,
  t.paid_at,
  t.created_at AS transaction_created_at,
  t.updated_at AS transaction_updated_at
`;

function mapEventPaidRow(row) {
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

async function attachTransactionItems(eventPaidList) {
  if (eventPaidList.length === 0) return eventPaidList;

  const transactionIds = eventPaidList.map((item) => item.transactionId);
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

  return eventPaidList.map((item) => ({
    ...item,
    transaction: item.transaction
      ? {
          ...item.transaction,
          items: itemMap.get(item.transactionId) || []
        }
      : item.transaction
  }));
}

async function getMyEventPaid(userId) {
  const rows = await query(
    `SELECT
      ${eventPaidSelect}
    FROM event_paid ep
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

  return attachTransactionItems(rows.map(mapEventPaidRow));
}

async function getByQrCode(qrCode) {
  const rows = await query(
    `SELECT
      ${eventPaidSelect}
    FROM event_paid ep
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

  return rows[0] ? mapEventPaidRow(rows[0]) : null;
}

function canScanEventPaid(eventPaid, user) {
  return user.role === "admin" || eventPaid.event?.createdBy === user.id;
}

async function scanQrCode(qrCode, user) {
  const existing = await getByQrCode(qrCode);
  if (!existing) {
    throw new ApiError(404, "QR code not found");
  }

  if (!canScanEventPaid(existing, user)) {
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
      "UPDATE event_paid SET attendance_status = 'attended', attended_at = UTC_TIMESTAMP() WHERE qr_code = ? AND attendance_status = 'not_attended'",
      [qrCode]
    );

    const [rows] = await connection.execute(
      `SELECT
        ${eventPaidSelect}
      FROM event_paid ep
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
      ...mapEventPaidRow(rows[0]),
      alreadyAttended: false
    };
  });
}

export default {
  getMyEventPaid,
  getByQrCode,
  scanQrCode
};
