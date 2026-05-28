import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import ticketService from "./ticket.service.js";

const getMyTickets = asyncHandler(async (req, res) => {
  const data = await ticketService.getMyTickets(req.user.id);
  return successResponse(res, 200, "My ticket list", data);
});

const scanQrCode = asyncHandler(async (req, res) => {
  const qrCode = req.body.qrCode || req.params.qrCode;
  const data = await ticketService.scanQrCode(qrCode, req.user);
  return successResponse(res, 200, "QR code scanned", data);
});

export default {
  getMyTickets,
  scanQrCode
};
