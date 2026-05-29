import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import financeService from "./finance.service.js";

const getFinanceList = asyncHandler(async (req, res) => {
  const data = await financeService.getFinanceList({
    publishedBy: req.params.published_by,
    organizerId: req.params.organizer_id
  });
  return successResponse(res, 200, "Finance list", data);
});

export default {
  getFinanceList
};
