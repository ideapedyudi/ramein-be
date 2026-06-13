import express from "express";
import { body, param, query as queryValidator } from "express-validator";
import authenticate from "../../middlewares/authenticate.js";
import validateRequest from "../../middlewares/validateRequest.js";
import controller from "./feedbackCreator.controller.js";

const router = express.Router();

const creatorTypeOptions = ["organizer", "user"];

router.get(
  "/",
  [
    queryValidator("rating").optional().isInt({ min: 1, max: 5 }),
    queryValidator("creatorType").optional().isIn(creatorTypeOptions),
    queryValidator("creator_type").optional().isIn(creatorTypeOptions),
    queryValidator("creatorId").optional().isUUID(),
    queryValidator("creator_id").optional().isUUID(),
    validateRequest
  ],
  controller.getFeedbackCreatorList
);

router.get(
  "/creator/:creatorId",
  [
    param("creatorId").isUUID(),
    queryValidator("creatorType").optional().isIn(creatorTypeOptions),
    queryValidator("creator_type").optional().isIn(creatorTypeOptions),
    validateRequest
  ],
  controller.getFeedbackCreatorByCreatorId
);

router.get(
  "/:id",
  [param("id").isUUID(), validateRequest],
  controller.getFeedbackCreatorDetail
);

router.post(
  "/",
  authenticate,
  [
    body("rating").isInt({ min: 1, max: 5 }),
    body("review").optional({ nullable: true }).isString(),
    body("creatorType").optional().isIn(creatorTypeOptions),
    body("creator_type").optional().isIn(creatorTypeOptions),
    body("creatorId").optional().isUUID(),
    body("creator_id").optional().isUUID(),
    body().custom((value) => {
      const creatorType = value.creatorType ?? value.creator_type;
      const creatorId = value.creatorId ?? value.creator_id;

      if (!creatorType) {
        throw new Error("creatorType is required");
      }

      if (!creatorId) {
        throw new Error("creatorId is required");
      }

      return true;
    }),
    validateRequest
  ],
  controller.createFeedbackCreator
);

router.patch(
  "/:id",
  authenticate,
  [
    param("id").isUUID(),
    body("rating").optional().isInt({ min: 1, max: 5 }),
    body("review").optional({ nullable: true }).isString(),
    body().custom((value) => {
      if (value.rating === undefined && value.review === undefined) {
        throw new Error("rating or review is required");
      }

      return true;
    }),
    validateRequest
  ],
  controller.updateFeedbackCreator
);

router.put(
  "/:id",
  authenticate,
  [
    param("id").isUUID(),
    body("rating").optional().isInt({ min: 1, max: 5 }),
    body("review").optional({ nullable: true }).isString(),
    body().custom((value) => {
      if (value.rating === undefined && value.review === undefined) {
        throw new Error("rating or review is required");
      }

      return true;
    }),
    validateRequest
  ],
  controller.updateFeedbackCreator
);

router.delete(
  "/:id",
  authenticate,
  [param("id").isUUID(), validateRequest],
  controller.removeFeedbackCreator
);

export default router;
