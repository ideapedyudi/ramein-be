import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import service from "./creator.service.js";

const getCreator = asyncHandler(async (req, res) => {
  const data = await service.getCreatorById(req.params.id);
  return successResponse(res, 200, "Creator detail", data);
});

export default {
  getCreator
};
