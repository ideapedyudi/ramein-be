import { query } from "../../db/mysql.js";

function mapFinanceRow(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    event_id: row.event_id,
    transaksi_id: row.transaksi_id,
    organizer_id: row.organizer_id,
    gross_amount: Number(row.gross_amount),
    admin_income: Number(row.admin_income || 0),
    time_transaksi: row.time_transaksi,
    published_by: row.published_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
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
          title: row.event_title
        }
      : undefined,
    organizer: row.organizer_name
      ? {
          id: row.organizer_id,
          name: row.organizer_name
        }
      : undefined
  };
}

async function getFinanceList({ publishedBy, organizerId }) {
  const clauses = ["f.published_by = ?"];
  const values = [publishedBy];

  if (organizerId) {
    clauses.push("f.organizer_id = ?");
    values.push(organizerId);
  }

  const rows = await query(
    `SELECT
      f.*,
      u.name AS user_name,
      u.email AS user_email,
      e.title AS event_title,
      o.name AS organizer_name
    FROM finance f
    JOIN users u ON u.id = f.user_id
    JOIN events e ON e.id = f.event_id
    JOIN organizers o ON o.id = f.organizer_id
    WHERE ${clauses.join(" AND ")}
    ORDER BY f.time_transaksi DESC, f.created_at DESC`,
    values
  );

  return rows.map(mapFinanceRow);
}

export default {
  getFinanceList
};
