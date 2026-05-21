import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse  } from "../../utils/response.js";
import eventService from "./event.service.js";

const listEvents = asyncHandler(async (req, res) => {
  const data = await eventService.listEvents(req.query);
  return successResponse(res, 200, "Event list", data);
});

const getEvent = asyncHandler(async (req, res) => {
  const data = await eventService.getEventById(req.params.id);
  return successResponse(res, 200, "Event detail", data);
});

const createEvent = asyncHandler(async (req, res) => {
  const data = await eventService.createEvent(req.body, req.user._id);
  return successResponse(res, 201, "Event created", data);
});

const updateEvent = asyncHandler(async (req, res) => {
  const data = await eventService.updateEvent(req.params.id, req.body, req.user);
  return successResponse(res, 200, "Event updated", data);
});

const deleteEvent = asyncHandler(async (req, res) => {
  await eventService.deleteEvent(req.params.id, req.user);
  return successResponse(res, 200, "Event deleted");
});

const publishEvent = asyncHandler(async (req, res) => {
  const data = await eventService.publishEvent(req.params.id, req.user);
  return successResponse(res, 200, "Event published", data);
});

export default {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent
};
