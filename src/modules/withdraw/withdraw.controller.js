import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import withdrawService from "./withdraw.service.js";

const createWithdraw = asyncHandler(async (req, res) => {
  const data = await withdrawService.createWithdraw(req.body, req.user);
  return successResponse(res, 201, "Withdraw created", data);
});

const getMyWithdraws = asyncHandler(async (req, res) => {
  const data = await withdrawService.getMyWithdraws(req.user.id);
  return successResponse(res, 200, "My withdraw list", data);
});

const getAllWithdraws = asyncHandler(async (req, res) => {
  const data = await withdrawService.getAllWithdraws();
  return successResponse(res, 200, "All withdraw list", data);
});

const updateWithdrawStatus = asyncHandler(async (req, res) => {
  const data = await withdrawService.updateWithdrawStatus(req.body);
  return successResponse(res, 200, "Withdraw status updated", data);
});

export default {
  createWithdraw,
  getMyWithdraws,
  getAllWithdraws,
  updateWithdrawStatus
};
