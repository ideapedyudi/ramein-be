import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import eventService from "../events/event.service.js";
import transactionService from "../transactions/transaction.service.js";

const getMyEvents = asyncHandler(async (req, res) => {
  const data = await eventService.listMyEvents(req.query, req.user);
  return successResponse(res, 200, "My event list", data);
});

const getMyPurchasedEvents = asyncHandler(async (req, res) => {
  const data = await transactionService.getMyPurchasedEvents(req.user.id);
  return successResponse(res, 200, "My purchased event list", data);
});

export default {
  getMyEvents,
  getMyPurchasedEvents
};
