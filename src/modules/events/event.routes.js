import express from "express";
import { body  } from "express-validator";
import authenticate from "../../middlewares/authenticate.js";
import authorize from "../../middlewares/authorize.js";
import validateRequest from "../../middlewares/validateRequest.js";
import controller from "./event.controller.js";

const router = express.Router();

router.get("/", controller.listEvents);
router.get("/:id", controller.getEvent);

router.post(
  "/",
  authenticate,
  [
    body("title").notEmpty(),
    body("description").notEmpty(),
    body("categoryId").isUUID(),
    body("organizerId").isUUID(),
    body("cityId").isUUID(),
    body("addressDetail").notEmpty(),
    body("startDateTime").isISO8601(),
    body("endDateTime").isISO8601(),
    body("ticketTypes").isArray({ min: 1 }),
    validateRequest
  ],
  controller.createEvent
);

router.patch("/:id", authenticate, controller.updateEvent);
router.delete("/:id", authenticate, controller.deleteEvent);
router.post("/:id/publish", authenticate, authorize("admin"), controller.publishEvent);

export default router;
