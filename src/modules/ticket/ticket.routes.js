import express from "express";
import { body, param } from "express-validator";
import authenticate from "../../middlewares/authenticate.js";
import validateRequest from "../../middlewares/validateRequest.js";
import controller from "./ticket.controller.js";

const router = express.Router();

router.get("/", authenticate, controller.getMyTickets);
router.get("/me", authenticate, controller.getMyTickets);

router.post(
  "/qr-code/scan",
  authenticate,
  [body("qrCode").trim().notEmpty(), validateRequest],
  controller.scanQrCode
);

router.post(
  "/qr-code/:qrCode/scan",
  authenticate,
  [param("qrCode").trim().notEmpty(), validateRequest],
  controller.scanQrCode
);

export default router;
