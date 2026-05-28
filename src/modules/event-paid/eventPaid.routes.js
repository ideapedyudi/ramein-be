import express from "express";
import { body, param } from "express-validator";
import authenticate from "../../middlewares/authenticate.js";
import validateRequest from "../../middlewares/validateRequest.js";
import controller from "./eventPaid.controller.js";

const router = express.Router();

router.get("/me", authenticate, controller.getMyEventPaid);

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
