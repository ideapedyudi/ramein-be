import express from "express";
import { body  } from "express-validator";
import authenticate from "../../middlewares/authenticate.js";
import authorize from "../../middlewares/authorize.js";
import validateRequest from "../../middlewares/validateRequest.js";
import controller from "./transaction.controller.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  [
    body("eventId").isUUID(),
    body("items").isArray({ min: 1 }),
    body("items.*.ticketTypeId").isUUID(),
    body("items.*.quantity").isInt({ min: 1 }),
    validateRequest
  ],
  controller.createTransaction
);

router.get("/me", authenticate, controller.getMyTransactions);
router.get("/admin/all", authenticate, authorize("admin"), controller.getAllTransactions);

export default router;
