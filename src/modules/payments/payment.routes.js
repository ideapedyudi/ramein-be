import express from "express";
import paymentController from "./payment.controller.js";

const router = express.Router();

router.post("/midtrans/notification", paymentController.midtransNotification);

export default router;
