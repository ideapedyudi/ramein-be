import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import eventPaidService from "./eventPaid.service.js";

const getMyEventPaid = asyncHandler(async (req, res) => {
  const data = await eventPaidService.getMyEventPaid(req.user.id);
  return successResponse(res, 200, "My paid event QR list", data);
});

const scanQrCode = asyncHandler(async (req, res) => {
  const qrCode = req.body.qrCode || req.params.qrCode;
  const data = await eventPaidService.scanQrCode(qrCode, req.user);
  return successResponse(res, 200, "QR code scanned", data);
});

export default {
  getMyEventPaid,
  scanQrCode
};
