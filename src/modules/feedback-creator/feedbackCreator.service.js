import { query } from "../../db/mysql.js";
import ApiError from "../../utils/apiError.js";
import { generateId } from "../../utils/id.js";

const DEFAULT_ORGANIZER_ID = "00000000-0000-0000-0000-000000000000";

function getPayloadValue(payload, camelKey, snakeKey) {
  if (payload[camelKey] !== undefined) return payload[camelKey];
  return payload[snakeKey];
}

function mapFeedbackCreatorRow(row) {
  return {
    id: row.id,
    rating: row.rating,
    review: row.review,
    creatorType: row.creator_type,
    creatorId: row.creator_id,
    creator: {
      id: row.creator_id,
      type: row.creator_type,
      name: row.creator_type === "organizer" ? row.organizer_name : row.creator_user_name,
      bio: row.creator_type === "organizer" ? row.organizer_description : null
    },
    createdBy: {
      id: row.created_by,
      name: row.reviewer_name,
      email: row.reviewer_email
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function ensureCreatorExists(creatorType, creatorId) {
  if (creatorType === "organizer") {
    const rows = await query(
      `SELECT id
      FROM organizers
      WHERE id = ? AND id <> ? AND is_active = 1
      LIMIT 1`,
      [creatorId, DEFAULT_ORGANIZER_ID]
    );

    if (rows.length === 0) {
      throw new ApiError(400, "Invalid creator");
    }

    return;
  }

  const rows = await query(
    `SELECT id
    FROM users
    WHERE id = ? AND is_active = 1
    LIMIT 1`,
    [creatorId]
  );

  if (rows.length === 0) {
    throw new ApiError(400, "Invalid creator");
  }
}

async function createFeedbackCreator(payload, user) {
  const creatorType = getPayloadValue(payload, "creatorType", "creator_type");
  const creatorId = getPayloadValue(payload, "creatorId", "creator_id");
  const rating = Number(payload.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError(400, "Invalid rating");
  }

  await ensureCreatorExists(creatorType, creatorId);

  const feedbackId = generateId();
  await query(
    `INSERT INTO feedback_creator (
      id,
      rating,
      review,
      creator_type,
      creator_id,
      created_by
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [feedbackId, rating, payload.review ?? null, creatorType, creatorId, user.id]
  );

  const rows = await query(
    `SELECT
      fc.*,
      reviewer.name AS reviewer_name,
      reviewer.email AS reviewer_email,
      o.name AS organizer_name,
      o.description AS organizer_description,
      cu.name AS creator_user_name
    FROM feedback_creator fc
    JOIN users reviewer ON reviewer.id = fc.created_by
    LEFT JOIN organizers o ON fc.creator_type = 'organizer' AND o.id = fc.creator_id
    LEFT JOIN users cu ON fc.creator_type = 'user' AND cu.id = fc.creator_id
    WHERE fc.id = ?
    LIMIT 1`,
    [feedbackId]
  );

  return mapFeedbackCreatorRow(rows[0]);
}

async function getFeedbackCreatorList(filter = {}) {
  const clauses = [];
  const values = [];
  const creatorType = getPayloadValue(filter, "creatorType", "creator_type");
  const creatorId = getPayloadValue(filter, "creatorId", "creator_id");

  if (filter.rating) {
    clauses.push("fc.rating = ?");
    values.push(filter.rating);
  }

  if (creatorType) {
    clauses.push("fc.creator_type = ?");
    values.push(creatorType);
  }

  if (creatorId) {
    clauses.push("fc.creator_id = ?");
    values.push(creatorId);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await query(
    `SELECT
      fc.*,
      reviewer.name AS reviewer_name,
      reviewer.email AS reviewer_email,
      o.name AS organizer_name,
      o.description AS organizer_description,
      cu.name AS creator_user_name
    FROM feedback_creator fc
    JOIN users reviewer ON reviewer.id = fc.created_by
    LEFT JOIN organizers o ON fc.creator_type = 'organizer' AND o.id = fc.creator_id
    LEFT JOIN users cu ON fc.creator_type = 'user' AND cu.id = fc.creator_id
    ${where}
    ORDER BY fc.created_at DESC, fc.id DESC`,
    values
  );

  return rows.map(mapFeedbackCreatorRow);
}

async function getFeedbackCreatorByCreatorId(creatorId, creatorType) {
  const filter = { creatorId };
  if (creatorType !== undefined) {
    filter.creatorType = creatorType;
  }

  return getFeedbackCreatorList(filter);
}

export default {
  createFeedbackCreator,
  getFeedbackCreatorList,
  getFeedbackCreatorByCreatorId
};
