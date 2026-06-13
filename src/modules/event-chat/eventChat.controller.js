import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import eventChatService from "../events/eventChat.service.js";

const chat = asyncHandler(async (req, res) => {
  const data = await eventChatService.chatEventAssistant(req.body);
  return successResponse(res, 200, "Event chat response", data);
});

export default {
  chat
};
