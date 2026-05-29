import express from "express";
import { body } from "express-validator";
import authenticate from "../../middlewares/authenticate.js";
import authorize from "../../middlewares/authorize.js";
import validateRequest from "../../middlewares/validateRequest.js";
import controller from "./withdraw.controller.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  [
    body("eventId").optional().isUUID(),
    body("event_id").optional().isUUID(),
    body().custom((value) => {
      if (!value.eventId && !value.event_id) {
        throw new Error("eventId is required");
      }
      return true;
    }),
    body("totalAmount").optional().isFloat({ min: 0 }),
    body("total_amount").optional().isFloat({ min: 0 }),
    body().custom((value) => {
      if (value.totalAmount === undefined && value.total_amount === undefined) {
        throw new Error("totalAmount is required");
      }
      return true;
    }),
    body("bankName").optional().isString(),
    body("bank_name").optional().isString(),
    body("bankAccount").optional().isString(),
    body("bank_account").optional().isString(),
    body("accountNumber").optional().isString(),
    body("account_number").optional().isString(),
    validateRequest
  ],
  controller.createWithdraw
);

router.get("/me", authenticate, controller.getMyWithdraws);
router.get("/all", authenticate, authorize("admin"), controller.getAllWithdraws);
router.post(
  "/status",
  authenticate,
  authorize("admin"),
  [
    body("id").optional().isUUID(),
    body("withdraw_id").optional().isUUID(),
    body().custom((value) => {
      if (!value.id && !value.withdraw_id) {
        throw new Error("id is required");
      }
      return true;
    }),
    body("status").isIn(["pending", "approved", "rejected"]),
    validateRequest
  ],
  controller.updateWithdrawStatus
);

export default router;
