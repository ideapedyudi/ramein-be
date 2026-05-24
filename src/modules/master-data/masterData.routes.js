import express from "express";
import { body  } from "express-validator";
import authenticate from "../../middlewares/authenticate.js";
import authorize from "../../middlewares/authorize.js";
import validateRequest from "../../middlewares/validateRequest.js";
import controller from "./masterData.controller.js";

const router = express.Router();

router.get("/:resource(categories|cities|organizers)", controller.list);

router.post(
  "/:resource(categories|cities|organizers)",
  authenticate,
  authorize("admin"),
  [
    body("name").notEmpty(),
    body("description").optional().isString(),
    body("contactName").optional().isString(),
    body("contactEmail").optional().isEmail(),
    body("contactPhone").optional().isString(),
    validateRequest
  ],
  controller.create
);

router.patch(
  "/:resource(categories|cities|organizers)/:id",
  authenticate,
  authorize("admin"),
  [
    body("name").optional().isString(),
    body("description").optional().isString(),
    body("contactName").optional().isString(),
    body("contactEmail").optional().isEmail(),
    body("contactPhone").optional().isString(),
    body("isActive").optional().isBoolean(),
    validateRequest
  ],
  controller.update
);

router.delete(
  "/:resource(categories|cities|organizers)/:id",
  authenticate,
  authorize("admin"),
  controller.remove
);

export default router;
