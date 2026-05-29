import express from "express";
import { param } from "express-validator";
import authenticate from "../../middlewares/authenticate.js";
import authorize from "../../middlewares/authorize.js";
import validateRequest from "../../middlewares/validateRequest.js";
import controller from "./finance.controller.js";

const router = express.Router();

router.get(
  "/:published_by/:organizer_id?",
  authenticate,
  authorize("admin"),
  [
    param("published_by").isIn(["admin", "user"]),
    param("organizer_id").optional().isUUID(),
    validateRequest
  ],
  controller.getFinanceList
);

export default router;
