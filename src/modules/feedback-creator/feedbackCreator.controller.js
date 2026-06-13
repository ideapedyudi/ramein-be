import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import feedbackCreatorService from "./feedbackCreator.service.js";

const createFeedbackCreator = asyncHandler(async (req, res) => {
  const data = await feedbackCreatorService.createFeedbackCreator(req.body, req.user);
  return successResponse(res, 201, "Creator feedback created", data);
});

const getFeedbackCreatorList = asyncHandler(async (req, res) => {
  const data = await feedbackCreatorService.getFeedbackCreatorList(req.query);
  return successResponse(res, 200, "Creator feedback list", data);
});

const getFeedbackCreatorByCreatorId = asyncHandler(async (req, res) => {
  const data = await feedbackCreatorService.getFeedbackCreatorByCreatorId(
    req.params.creatorId,
    req.query.creatorType
  );
  return successResponse(res, 200, "Creator feedback list", data);
});

export default {
  createFeedbackCreator,
  getFeedbackCreatorList,
  getFeedbackCreatorByCreatorId
};
