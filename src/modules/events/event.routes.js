import express from "express";
import { body, query as queryValidator } from "express-validator";
import authenticate from "../../middlewares/authenticate.js";
import optionalAuthenticate from "../../middlewares/optionalAuthenticate.js";
import validateRequest from "../../middlewares/validateRequest.js";
import controller from "./event.controller.js";

const router = express.Router();

router.get("/", optionalAuthenticate, controller.listEvents);
router.get(
  "/me/purchased",
  [queryValidator("userId").isUUID(), validateRequest],
  controller.listPurchasedEvents
);
router.get("/me", authenticate, controller.listMyEvents);
router.get("/trending", controller.trendingEvents);
router.get("/recommended", controller.recommendedEvents);
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
    body("banner").optional().isString(),
    body("eventType").optional().isString(),
    body("event_type").optional().isString(),
    body("labelOnline").optional().isString(),
    body("label_online").optional().isString(),
    body("urlOnline").optional().isURL(),
    body("url_online").optional().isURL(),
    body("paymentType").optional().isIn(["free", "paid"]),
    body("payment_type").optional().isIn(["free", "paid"]),
    body("startDateTime").isISO8601(),
    body("endDateTime").isISO8601(),
    body("ticketTypes").isArray({ min: 1 }),
    validateRequest
  ],
  controller.createEvent
);

router.patch("/:id", authenticate, controller.updateEvent);
router.delete("/:id", authenticate, controller.deleteEvent);

export default router;
