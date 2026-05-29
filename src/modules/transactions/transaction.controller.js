import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse  } from "../../utils/response.js";
import transactionService from "./transaction.service.js";

const createTransaction = asyncHandler(async (req, res) => {
  const data = await transactionService.createTransaction(req.body, req.user);
  return successResponse(res, 201, "Transaction created", data);
});

const getMyTransactions = asyncHandler(async (req, res) => {
  const data = await transactionService.getMyTransactions(req.user.id);
  return successResponse(res, 200, "Transaction list", data);
});

const getAllTransactions = asyncHandler(async (req, res) => {
  const data = await transactionService.getAllTransactions(req.query);
  return successResponse(res, 200, "All transactions", data);
});

const getEventStatistic = asyncHandler(async (req, res) => {
  const data = await transactionService.getEventStatistic(req.params.event_id, req.user);
  return successResponse(res, 200, "Event transaction statistic", data);
});

export default {
  createTransaction,
  getMyTransactions,
  getEventStatistic,
  getAllTransactions
};
