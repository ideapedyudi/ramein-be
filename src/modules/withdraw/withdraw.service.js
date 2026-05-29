import { query, transaction } from "../../db/mysql.js";
import ApiError from "../../utils/apiError.js";
import { generateId } from "../../utils/id.js";

function mapWithdrawRow(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    totalAmount: Number(row.total_amount),
    bank_name: row.bank_name,
    bank_account: row.bank_account,
    account_number: row.account_number,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    event: row.event_title
      ? {
          id: row.event_id,
          title: row.event_title,
          isWithdraw: Boolean(row.event_is_withdraw),
          is_withdraw: Boolean(row.event_is_withdraw)
        }
      : undefined,
    user: row.user_name
      ? {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email
        }
      : undefined
  };
}

function getPayloadValue(payload, camelKey, snakeKey) {
  if (payload[camelKey] !== undefined) return payload[camelKey];
  return payload[snakeKey];
}

async function createWithdraw(payload, user) {
  const eventId = getPayloadValue(payload, "eventId", "event_id");
  const totalAmount = Number(getPayloadValue(payload, "totalAmount", "total_amount"));
  const bankName = getPayloadValue(payload, "bankName", "bank_name") || null;
  const bankAccount = getPayloadValue(payload, "bankAccount", "bank_account") || null;
  const accountNumber = getPayloadValue(payload, "accountNumber", "account_number") || null;

  const eventRows = await query(
    "SELECT id, title, created_by, is_withdraw FROM events WHERE id = ? LIMIT 1",
    [eventId]
  );
  const event = eventRows[0];

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  if (user.role !== "admin" && event.created_by !== user.id) {
    throw new ApiError(403, "You are not allowed to withdraw this event");
  }

  if (event.is_withdraw) {
    throw new ApiError(400, "Withdraw already requested for this event");
  }

  const withdrawId = generateId();

  await transaction(async (connection) => {
    await connection.execute(
      `INSERT INTO withdraw (
        id,
        event_id,
        user_id,
        total_amount,
        bank_name,
        bank_account,
        account_number,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [withdrawId, eventId, user.id, totalAmount, bankName, bankAccount, accountNumber]
    );

    await connection.execute(
      "UPDATE events SET is_withdraw = 1 WHERE id = ?",
      [eventId]
    );
  });

  const rows = await query(
    `SELECT
      w.*,
      e.title AS event_title,
      e.is_withdraw AS event_is_withdraw,
      u.name AS user_name,
      u.email AS user_email
    FROM withdraw w
    JOIN events e ON e.id = w.event_id
    JOIN users u ON u.id = w.user_id
    WHERE w.id = ?
    LIMIT 1`,
    [withdrawId]
  );

  return mapWithdrawRow(rows[0]);
}

async function getMyWithdraws(userId) {
  const rows = await query(
    `SELECT
      w.*,
      e.title AS event_title,
      e.is_withdraw AS event_is_withdraw,
      u.name AS user_name,
      u.email AS user_email
    FROM withdraw w
    JOIN events e ON e.id = w.event_id
    JOIN users u ON u.id = w.user_id
    WHERE w.user_id = ?
    ORDER BY w.created_at DESC`,
    [userId]
  );

  return rows.map(mapWithdrawRow);
}

async function getAllWithdraws() {
  const rows = await query(
    `SELECT
      w.*,
      e.title AS event_title,
      e.is_withdraw AS event_is_withdraw,
      u.name AS user_name,
      u.email AS user_email
    FROM withdraw w
    JOIN events e ON e.id = w.event_id
    JOIN users u ON u.id = w.user_id
    ORDER BY w.created_at DESC`
  );

  return rows.map(mapWithdrawRow);
}

async function updateWithdrawStatus(payload) {
  const withdrawId = payload.id || payload.withdraw_id;
  const nextStatus = payload.status;

  const withdrawRows = await query(
    "SELECT id, event_id, status FROM withdraw WHERE id = ? LIMIT 1",
    [withdrawId]
  );
  const withdraw = withdrawRows[0];

  if (!withdraw) {
    throw new ApiError(404, "Withdraw not found");
  }

  await transaction(async (connection) => {
    await connection.execute(
      "UPDATE withdraw SET status = ? WHERE id = ?",
      [nextStatus, withdrawId]
    );

    if (nextStatus === "rejected") {
      await connection.execute(
        "UPDATE events SET is_withdraw = 0 WHERE id = ?",
        [withdraw.event_id]
      );
    }
  });

  const rows = await query(
    `SELECT
      w.*,
      e.title AS event_title,
      e.is_withdraw AS event_is_withdraw,
      u.name AS user_name,
      u.email AS user_email
    FROM withdraw w
    JOIN events e ON e.id = w.event_id
    JOIN users u ON u.id = w.user_id
    WHERE w.id = ?
    LIMIT 1`,
    [withdrawId]
  );

  return mapWithdrawRow(rows[0]);
}

export default {
  createWithdraw,
  getMyWithdraws,
  getAllWithdraws,
  updateWithdrawStatus
};
