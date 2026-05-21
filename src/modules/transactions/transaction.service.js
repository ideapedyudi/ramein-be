import { query, transaction } from "../../db/mysql.js";
import ApiError from "../../utils/apiError.js";
import paymentService from "../payments/payment.service.js";

function generateOrderId() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${Date.now()}-${random}`;
}

function mapTransactionRow(row) {
  return {
    _id: row.id,
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
  return query("SELECT * FROM event_ticket_types WHERE event_id = ? ORDER BY id ASC", [Number(eventId)]);
}

function findTicketById(tickets, ticketTypeId) {
  return tickets.find((ticket) => Number(ticket.id) === Number(ticketTypeId));
}

async function createTransaction(payload, user) {
  const eventRows = await query(
    "SELECT id, title, is_published, status FROM events WHERE id = ? LIMIT 1",
    [Number(payload.eventId)]
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
      ticketTypeId: Number(ticket.id),
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

  const transactionId = await transaction(async (connection) => {
    const [txResult] = await connection.execute(
      `INSERT INTO transactions (
        order_id,
        user_id,
        event_id,
        gross_amount,
        status,
        snap_token,
        redirect_url
      ) VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
      [
        orderId,
        Number(user.id),
        Number(payload.eventId),
        grossAmount,
        payment.token || null,
        payment.redirect_url || null
      ]
    );

    for (const item of items) {
      await connection.execute(
        `INSERT INTO transaction_items (
          transaction_id,
          ticket_type_id,
          ticket_name,
          unit_price,
          quantity,
          subtotal
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [txResult.insertId, item.ticketTypeId, item.ticketName, item.unitPrice, item.quantity, item.subtotal]
      );
    }

    return txResult.insertId;
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
    [Number(userId)]
  );

  const txs = rows.map((row) => {
    const tx = mapTransactionRow(row);
    tx.event = {
      _id: tx.eventId,
      id: tx.eventId,
      title: row.event_title,
      startDateTime: row.event_start_datetime
    };
    return tx;
  });

  return attachItems(txs);
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
    values.push(Number(filter.eventId));
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
      _id: tx.userId,
      id: tx.userId,
      name: row.user_name,
      email: row.user_email
    };
    tx.event = {
      _id: tx.eventId,
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
    await connection.execute(
      "INSERT INTO payment_logs (order_id, notification_key, payload) VALUES (?, ?, ?)",
      [payload.order_id, notificationKey, JSON.stringify(payload)]
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
          [Number(item.quantity), Number(item.ticket_type_id)]
        );
      }
    }

    return { duplicated: false, status: mappedStatus };
  });
}

export default {
  createTransaction,
  getMyTransactions,
  getAllTransactions,
  handleMidtransNotification
};
