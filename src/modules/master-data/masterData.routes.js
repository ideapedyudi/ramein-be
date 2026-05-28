import express from "express";
import { body } from "express-validator";
import authenticate from "../../middlewares/authenticate.js";
import authorize from "../../middlewares/authorize.js";
import validateRequest from "../../middlewares/validateRequest.js";
import controller from "./masterData.controller.js";

const router = express.Router();

const masterCreateValidators = [
  body("name").notEmpty(),
  body("provinsi").optional().isString(),
  body("description").optional().isString(),
  body("contactName").optional().isString(),
  body("contactEmail").optional().isEmail(),
  body("contactPhone").optional().isString(),
  validateRequest
];

const masterUpdateValidators = [
  body("name").optional().isString(),
  body("provinsi").optional().isString(),
  body("description").optional().isString(),
  body("contactName").optional().isString(),
  body("contactEmail").optional().isEmail(),
  body("contactPhone").optional().isString(),
  body("isActive").optional().isBoolean(),
  validateRequest
];

router.get("/:resource(categories|cities|organizers)", controller.list);
router.get("/:resource(categories|cities|organizers)/:id", controller.detail);

router.post(
  "/:resource(categories|cities|organizers)",
  authenticate,
  authorize("admin"),
  masterCreateValidators,
  controller.create
);

router.patch(
  "/:resource(categories|cities|organizers)/:id",
  authenticate,
  authorize("admin"),
  masterUpdateValidators,
  controller.update
);

router.put(
  "/:resource(categories|cities|organizers)/:id",
  authenticate,
  authorize("admin"),
  masterUpdateValidators,
  controller.update
);

router.delete(
  "/:resource(categories|cities|organizers)/:id",
  authenticate,
  authorize("admin"),
  controller.remove
);

export default router;
