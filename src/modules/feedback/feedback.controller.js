import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import feedbackService from "./feedback.service.js";

const createFeedback = asyncHandler(async (req, res) => {
  const data = await feedbackService.createFeedback(req.body);
  return successResponse(res, 201, "Feedback created", data);
});

const getFeedbackList = asyncHandler(async (req, res) => {
  const data = await feedbackService.getFeedbackList(req.query);
  return successResponse(res, 200, "Feedback list", data);
});

const getFeedbackDetail = asyncHandler(async (req, res) => {
  const data = await feedbackService.getFeedbackDetail(req.params.id);
  return successResponse(res, 200, "Feedback detail", data);
});

const removeFeedback = asyncHandler(async (req, res) => {
  const data = await feedbackService.removeFeedback(req.params.id);
  return successResponse(res, 200, "Feedback deleted", data);
});

export default {
  createFeedback,
  getFeedbackList,
  getFeedbackDetail,
  removeFeedback
};
