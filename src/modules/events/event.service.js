import Event from "../../models/Event.js";
import Organizer from "../../models/Organizer.js";
import ApiError from "../../utils/apiError.js";

async function listEvents(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.organizerId) filter.organizerId = query.organizerId;
  if (query.search) filter.$text = { $search: query.search };

  return Event.find(filter)
    .populate("categoryId cityId venueId", "name")
    .populate("organizerId", "name contactName contactEmail contactPhone")
    .populate("createdBy", "name email")
    .sort({ startDateTime: 1 });
}

async function getEventById(id) {
  const event = await Event.findById(id)
    .populate("categoryId cityId venueId", "name")
    .populate("organizerId", "name contactName contactEmail contactPhone")
    .populate("createdBy", "name email");
  if (!event) throw new ApiError(404, "Event not found");
  return event;
}

async function createEvent(payload, userId) {
  const organizer = await Organizer.findById(payload.organizerId);
  if (!organizer || !organizer.isActive) {
    throw new ApiError(400, "Invalid organizer");
  }

  return Event.create({
    ...payload,
    createdBy: userId,
    status: "pending",
    isPublished: false
  });
}

function canManageEvent(event, user) {
  return user.role === "admin" || event.createdBy.toString() === user._id.toString();
}

async function updateEvent(id, payload, user) {
  const event = await Event.findById(id);
  if (!event) throw new ApiError(404, "Event not found");
  if (!canManageEvent(event, user)) throw new ApiError(403, "Forbidden");

  if (payload.organizerId) {
    const organizer = await Organizer.findById(payload.organizerId);
    if (!organizer || !organizer.isActive) {
      throw new ApiError(400, "Invalid organizer");
    }
  }

  Object.assign(event, payload);
  if (user.role !== "admin") {
    event.status = "pending";
    event.isPublished = false;
  }
  await event.save();
  return event;
}

async function deleteEvent(id, user) {
  const event = await Event.findById(id);
  if (!event) throw new ApiError(404, "Event not found");
  if (!canManageEvent(event, user)) throw new ApiError(403, "Forbidden");
  await event.deleteOne();
}

async function publishEvent(id, adminUser) {
  if (adminUser.role !== "admin") throw new ApiError(403, "Forbidden");
  const event = await Event.findById(id);
  if (!event) throw new ApiError(404, "Event not found");
  event.status = "published";
  event.isPublished = true;
  await event.save();
  return event;
}

export default {
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent
};
