import { query } from "../../db/mysql.js";
import ApiError from "../../utils/apiError.js";
import { generateId } from "../../utils/id.js";

function mapFeedbackRow(row) {
  return {
    id: row.id,
    rating: row.rating,
    review: row.review,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function createFeedback(payload) {
  const feedbackId = generateId();

  await query(
    `INSERT INTO feedback (
      id,
      rating,
      review
    ) VALUES (?, ?, ?)`,
    [feedbackId, payload.rating, payload.review ?? null]
  );

  const rows = await query("SELECT * FROM feedback WHERE id = ? LIMIT 1", [feedbackId]);
  return mapFeedbackRow(rows[0]);
}

async function getFeedbackList(filter = {}) {
  const clauses = [];
  const values = [];

  if (filter.rating) {
    clauses.push("rating = ?");
    values.push(filter.rating);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await query(`SELECT * FROM feedback ${where} ORDER BY created_at DESC, id DESC`, values);

  return rows.map(mapFeedbackRow);
}

async function getFeedbackDetail(id) {
  const rows = await query("SELECT * FROM feedback WHERE id = ? LIMIT 1", [id]);
  const feedback = rows[0];

  if (!feedback) {
    throw new ApiError(404, "Feedback not found");
  }

  return mapFeedbackRow(feedback);
}

async function removeFeedback(id) {
  const feedback = await getFeedbackDetail(id);
  await query("DELETE FROM feedback WHERE id = ?", [id]);
  return feedback;
}

export default {
  createFeedback,
  getFeedbackList,
  getFeedbackDetail,
  removeFeedback
};
