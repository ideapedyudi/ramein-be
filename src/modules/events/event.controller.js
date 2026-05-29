import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse  } from "../../utils/response.js";
import eventService from "./event.service.js";

const listEvents = asyncHandler(async (req, res) => {
  const data = await eventService.listEvents(req.query, req.user);
  return successResponse(res, 200, "Event list", data);
});

const listMyEvents = asyncHandler(async (req, res) => {
  const data = await eventService.listMyEvents(req.query, req.user);
  return successResponse(res, 200, "My event list", data);
});

const listPurchasedEvents = asyncHandler(async (req, res) => {
  const data = await eventService.listPurchasedEvents(req.query.userId);
  return successResponse(res, 200, "Purchased event list", data);
});

const trendingEvents = asyncHandler(async (req, res) => {
  const data = await eventService.listTrendingEvents();
  return successResponse(res, 200, "Trending event list", data);
});

const exploreEvents = asyncHandler(async (req, res) => {
  const data = await eventService.listExploreEvents(req.query);
  return successResponse(res, 200, "Explore event list", data);
});

const recommendedEvents = asyncHandler(async (req, res) => {
  const data = await eventService.listRecommendedEvents(req.query);
  return successResponse(res, 200, "Recommended event list", data);
});

const interestEvents = asyncHandler(async (req, res) => {
  const data = await eventService.listInterestEvents(req.query);
  return successResponse(res, 200, "Interest event list", data);
});

const getEvent = asyncHandler(async (req, res) => {
  const data = await eventService.getEventById(req.params.id);
  return successResponse(res, 200, "Event detail", data);
});

const createEvent = asyncHandler(async (req, res) => {
  const data = await eventService.createEvent(req.body, req.user);
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

export default {
  listEvents,
  listMyEvents,
  listPurchasedEvents,
  trendingEvents,
  exploreEvents,
  recommendedEvents,
  interestEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent
};
