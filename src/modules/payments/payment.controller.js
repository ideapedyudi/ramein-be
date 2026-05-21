import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse  } from "../../utils/response.js";
import transactionService from "../transactions/transaction.service.js";

const midtransNotification = asyncHandler(async (req, res) => {
  const result = await transactionService.handleMidtransNotification(req.body);
  return successResponse(res, 200, "Notification processed", result);
});

export default {
  midtransNotification
};
