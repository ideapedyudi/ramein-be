import { query, transaction } from "../../db/mysql.js";
import ApiError from "../../utils/apiError.js";
import paymentService from "../payments/payment.service.js";
import { generateId } from "../../utils/id.js";

function generateOrderId() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${Date.now()}-${random}`;
}

function generateQrCode() {
  return `EVP-${generateId()}`;
}

function mapTransactionRow(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    userId: row.user_id,
    eventId: row.event_id,
    grossAmount: Number(row.gross_amount),
    status: row.status,
    paymentProvider: row.payment_provider,
    snapToken: row.snap_token,
    redirectUrl: row.redirect_url,
    midtransTransactionStatus: row.midtrans_transaction_status,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTicketRow(row) {
  if (!row.ticket_id) return null;

  return {
    id: row.ticket_id,
    qrCode: row.qr_code,
    attendanceStatus: row.attendance_status,
    attendedAt: row.attended_at,
    createdAt: row.ticket_created_at,
    updatedAt: row.ticket_updated_at
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

async function getTicketsByEventId(eventId) {
  return query("SELECT * FROM event_ticket_types WHERE event_id = ? ORDER BY created_at ASC, id ASC", [eventId]);
}

function findTicketById(tickets, ticketTypeId) {
  return tickets.find((ticket) => ticket.id === ticketTypeId);
}

async function createTransaction(payload, user) {
  const eventRows = await query(
    "SELECT id, title, is_published, status FROM events WHERE id = ? LIMIT 1",
    [payload.eventId]
  );
  const event = eventRows[0];

  if (!event) throw new ApiError(404, "Event not found");
  if (!event.is_published || event.status !== "published") {
    throw new ApiError(400, "Event is not available");
  }

  const tickets = await getTicketsByEventId(event.id);
  const now = new Date();
  const items = [];
  let grossAmount = 0;

  for (const selectedItem of payload.items) {
    const ticket = findTicketById(tickets, selectedItem.ticketTypeId);
    if (!ticket) throw new ApiError(400, "Invalid ticket type");

    const saleStartAt = new Date(ticket.sale_start_at);
    const saleEndAt = new Date(ticket.sale_end_at);

    if (now < saleStartAt || now > saleEndAt) {
      throw new ApiError(400, `Ticket ${ticket.name} is not on sale`);
    }

    const available = Number(ticket.quota) - Number(ticket.sold);
    if (available < selectedItem.quantity) {
      throw new ApiError(400, `Insufficient quota for ticket ${ticket.name}`);
    }

    const subtotal = Number(ticket.price) * Number(selectedItem.quantity);
    grossAmount += subtotal;
    items.push({
      ticketTypeId: ticket.id,
      ticketName: ticket.name,
      unitPrice: Number(ticket.price),
      quantity: Number(selectedItem.quantity),
      subtotal
    });
  }

  const orderId = generateOrderId();
  const payment = await paymentService.createMidtransTransaction({
    orderId,
    grossAmount,
    customer: user
  });

  const transactionId = generateId();
  await transaction(async (connection) => {
    await connection.execute(
      `INSERT INTO transactions (
        id,
        order_id,
        user_id,
        event_id,
        gross_amount,
        status,
        snap_token,
        redirect_url
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        transactionId,
        orderId,
        user.id,
        payload.eventId,
        grossAmount,
        payment.token || null,
        payment.redirect_url || null
      ]
    );

    for (const item of items) {
      const itemId = generateId();
      await connection.execute(
        `INSERT INTO transaction_items (
          id,
          transaction_id,
          ticket_type_id,
          ticket_name,
          unit_price,
          quantity,
          subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [itemId, transactionId, item.ticketTypeId, item.ticketName, item.unitPrice, item.quantity, item.subtotal]
      );
    }
  });

  const createdRows = await query("SELECT * FROM transactions WHERE id = ? LIMIT 1", [transactionId]);
  const mapped = mapTransactionRow(createdRows[0]);
  mapped.items = items;
  return mapped;
}

async function attachItems(transactions) {
  if (transactions.length === 0) return transactions;

  const txIds = transactions.map((tx) => tx.id);
  const placeholders = txIds.map(() => "?").join(", ");
  const rows = await query(
    `SELECT * FROM transaction_items WHERE transaction_id IN (${placeholders}) ORDER BY id ASC`,
    txIds
  );

  const itemMap = new Map();
  for (const row of rows) {
    const item = mapTransactionItemRow(row);
    const list = itemMap.get(row.transaction_id) || [];
    list.push(item);
    itemMap.set(row.transaction_id, list);
  }

  return transactions.map((tx) => ({ ...tx, items: itemMap.get(tx.id) || [] }));
}

async function getMyTransactions(userId) {
  const rows = await query(
    `SELECT t.*, e.title AS event_title, e.start_datetime AS event_start_datetime
    FROM transactions t
    JOIN events e ON e.id = t.event_id
    WHERE t.user_id = ?
    ORDER BY t.created_at DESC`,
    [userId]
  );

  const txs = rows.map((row) => {
    const tx = mapTransactionRow(row);
    tx.event = {
      id: tx.eventId,
      title: row.event_title,
      startDateTime: row.event_start_datetime
    };
    return tx;
  });

  return attachItems(txs);
}

async function getEventStatistic(eventId, user) {
  const eventRows = await query("SELECT id, created_by FROM events WHERE id = ? LIMIT 1", [eventId]);
  const event = eventRows[0];

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  const rows = await query(
    `SELECT
      COALESCE(ticket_type_stats.terjual, 0) AS terjual,
      COALESCE(ticket_attendance_stats.hadir, 0) AS hadir,
      COALESCE(ticket_type_stats.kuota, 0) AS kuota,
      COALESCE(transaction_stats.revenue, 0) AS revenue
    FROM events e
    LEFT JOIN (
      SELECT
        event_id,
        SUM(sold) AS terjual,
        SUM(quota) AS kuota
      FROM event_ticket_types
      WHERE event_id = ?
      GROUP BY event_id
    ) ticket_type_stats ON ticket_type_stats.event_id = e.id
    LEFT JOIN (
      SELECT
        event_id,
        COUNT(*) AS hadir
      FROM ticket
      WHERE event_id = ? AND attendance_status = 'attended'
      GROUP BY event_id
    ) ticket_attendance_stats ON ticket_attendance_stats.event_id = e.id
    LEFT JOIN (
      SELECT
        event_id,
        SUM(gross_amount) AS revenue
      FROM transactions
      WHERE event_id = ? AND status = 'paid'
      GROUP BY event_id
    ) transaction_stats ON transaction_stats.event_id = e.id
    WHERE e.id = ?
    LIMIT 1`,
    [eventId, eventId, eventId, eventId]
  );

  const statistic = rows[0] || {};
  return {
    terjual: Number(statistic.terjual || 0),
    hadir: Number(statistic.hadir || 0),
    kuota: Number(statistic.kuota || 0),
    revenue: Number(statistic.revenue || 0)
  };
}

async function getMyPurchasedEvents(userId) {
  const rows = await query(
    `SELECT
      t.id AS transaction_id,
      t.order_id,
      t.gross_amount,
      t.status AS transaction_status,
      t.paid_at,
      t.created_at AS transaction_created_at,
      tk.id AS ticket_id,
      tk.qr_code,
      tk.attendance_status,
      tk.attended_at,
      tk.created_at AS ticket_created_at,
      tk.updated_at AS ticket_updated_at,
      e.id AS event_id,
      e.title AS event_title,
      e.description AS event_description,
      e.banner AS event_banner,
      e.start_datetime AS event_start_datetime,
      e.end_datetime AS event_end_datetime,
      e.visibility AS event_visibility,
      e.status AS event_status,
      c.id AS category_id,
      c.name AS category_name,
      ci.id AS city_id,
      ci.name AS city_name,
      o.id AS organizer_id,
      o.name AS organizer_name
    FROM transactions t
    JOIN events e ON e.id = t.event_id
    JOIN categories c ON c.id = e.category_id
    JOIN cities ci ON ci.id = e.city_id
    JOIN organizers o ON o.id = e.organizer_id
    LEFT JOIN ticket tk ON tk.transaction_id = t.id
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
        event: {
          id: row.event_id,
          title: row.event_title,
          description: row.event_description,
          banner: row.event_banner,
          startDateTime: row.event_start_datetime,
          endDateTime: row.event_end_datetime,
          visibility: row.event_visibility,
          status: row.event_status,
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
            name: row.organizer_name
          }
        },
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
          createdAt: row.transaction_created_at,
          ticket: mapTicketRow(row)
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

async function getAllTransactions(filter = {}) {
  const clauses = [];
  const values = [];

  if (filter.status) {
    clauses.push("t.status = ?");
    values.push(filter.status);
  }

  if (filter.eventId) {
    clauses.push("t.event_id = ?");
    values.push(filter.eventId);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = await query(
    `SELECT
      t.*,
      u.name AS user_name,
      u.email AS user_email,
      e.title AS event_title
    FROM transactions t
    JOIN users u ON u.id = t.user_id
    JOIN events e ON e.id = t.event_id
    ${where}
    ORDER BY t.created_at DESC`,
    values
  );

  const txs = rows.map((row) => {
    const tx = mapTransactionRow(row);
    tx.user = {
      id: tx.userId,
      name: row.user_name,
      email: row.user_email
    };
    tx.event = {
      id: tx.eventId,
      title: row.event_title
    };
    return tx;
  });

  return attachItems(txs);
}

async function handleMidtransNotification(payload) {
  if (!paymentService.verifyMidtransSignature(payload)) {
    throw new ApiError(401, "Invalid midtrans signature");
  }

  const notificationKey = `${payload.order_id}|${payload.transaction_status}|${payload.status_code}`;
  const existingLog = await query(
    "SELECT id FROM payment_logs WHERE notification_key = ? LIMIT 1",
    [notificationKey]
  );

  if (existingLog.length > 0) {
    return { duplicated: true };
  }

  return transaction(async (connection) => {
    const paymentLogId = generateId();
    await connection.execute(
      "INSERT INTO payment_logs (id, order_id, notification_key, payload) VALUES (?, ?, ?, ?)",
      [paymentLogId, payload.order_id, notificationKey, JSON.stringify(payload)]
    );

    const [txRows] = await connection.execute(
      "SELECT * FROM transactions WHERE order_id = ? LIMIT 1",
      [payload.order_id]
    );
    const tx = txRows[0];

    if (!tx) throw new ApiError(404, "Transaction not found");

    const currentStatus = tx.status;
    const mappedStatus = paymentService.mapMidtransStatus(payload);

    await connection.execute(
      "UPDATE transactions SET midtrans_transaction_status = ?, status = ?, paid_at = CASE WHEN ? = 'paid' AND status <> 'paid' THEN UTC_TIMESTAMP() ELSE paid_at END WHERE id = ?",
      [payload.transaction_status, mappedStatus, mappedStatus, tx.id]
    );

    if (mappedStatus === "paid" && currentStatus !== "paid") {
      const [itemRows] = await connection.execute(
        "SELECT ticket_type_id, quantity FROM transaction_items WHERE transaction_id = ?",
        [tx.id]
      );

      for (const item of itemRows) {
        await connection.execute(
          "UPDATE event_ticket_types SET sold = sold + ? WHERE id = ?",
          [Number(item.quantity), item.ticket_type_id]
        );
      }
    }

    if (mappedStatus === "paid") {
      await connection.execute(
        `INSERT INTO ticket (
          id,
          user_id,
          event_id,
          transaction_id,
          qr_code,
          attendance_status
        ) VALUES (?, ?, ?, ?, ?, 'not_attended')
        ON DUPLICATE KEY UPDATE updated_at = updated_at`,
        [generateId(), tx.user_id, tx.event_id, tx.id, generateQrCode()]
      );
    }

    return { duplicated: false, status: mappedStatus };
  });
}

export default {
  createTransaction,
  getMyTransactions,
  getMyPurchasedEvents,
  getEventStatistic,
  getAllTransactions,
  handleMidtransNotification
};
