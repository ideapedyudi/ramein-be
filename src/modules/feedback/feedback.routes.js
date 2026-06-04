import express from "express";
import { body, param, query as queryValidator } from "express-validator";
import authenticate from "../../middlewares/authenticate.js";
import authorize from "../../middlewares/authorize.js";
import validateRequest from "../../middlewares/validateRequest.js";
import controller from "./feedback.controller.js";

const router = express.Router();

const ratingOptions = [
  "Sangat Puas",
  "Puas",
  "Cukup Puas",
  "Tidak Puas",
  "Sangat Tidak Puas"
];

router.get(
  "/",
  [queryValidator("rating").optional().isIn(ratingOptions), validateRequest],
  controller.getFeedbackList
);

router.get(
  "/:id",
  [param("id").isUUID(), validateRequest],
  controller.getFeedbackDetail
);

router.post(
  "/",
  authenticate,
  [
    body("rating").isIn(ratingOptions),
    body("review").optional({ nullable: true }).isString(),
    validateRequest
  ],
  controller.createFeedback
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  [param("id").isUUID(), validateRequest],
  controller.removeFeedback
);

export default router;
