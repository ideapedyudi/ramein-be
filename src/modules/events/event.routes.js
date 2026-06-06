import express from "express";
import { body, param, query as queryValidator } from "express-validator";
import authenticate from "../../middlewares/authenticate.js";
import optionalAuthenticate from "../../middlewares/optionalAuthenticate.js";
import validateRequest from "../../middlewares/validateRequest.js";
import controller from "./event.controller.js";

const router = express.Router();

function validateDateTimeValue(value) {
  if (value === null || value === "") return true;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(String(value).trim())) return true;
  if (!Number.isNaN(new Date(value).getTime())) return true;
  throw new Error("Invalid datetime");
}

const eventUpdateValidators = [
  param("id").isUUID(),
  body("title").optional().isString().notEmpty(),
  body("description").optional().isString().notEmpty(),
  body("categoryId").optional().isUUID(),
  body("category_id").optional().isUUID(),
  body("organizerId").optional().isUUID(),
  body("organizer_id").optional().isUUID(),
  body("cityId").optional().isUUID(),
  body("city_id").optional().isUUID(),
  body("addressDetail").optional().isString().notEmpty(),
  body("address_detail").optional().isString().notEmpty(),
  body("banner").optional({ nullable: true }).isString(),
  body("eventType").optional({ nullable: true }).isString(),
  body("event_type").optional({ nullable: true }).isString(),
  body("labelOnline").optional({ nullable: true }).isString(),
  body("label_online").optional({ nullable: true }).isString(),
  body("urlOnline").optional({ nullable: true }).isURL(),
  body("url_online").optional({ nullable: true }).isURL(),
  body("paymentType").optional().isIn(["free", "paid"]),
  body("payment_type").optional().isIn(["free", "paid"]),
  body("startDateTime").optional().custom(validateDateTimeValue),
  body("start_datetime").optional().custom(validateDateTimeValue),
  body("endDateTime").optional().custom(validateDateTimeValue),
  body("end_datetime").optional().custom(validateDateTimeValue),
  body("status").optional().isIn(["draft", "pending", "published", "rejected", "completed", "cancelled"]),
  body("isPublished").optional().isBoolean(),
  body("is_published").optional().isBoolean(),
  body("ticketTypes").optional().isArray({ min: 1 }),
  body("ticket_types").optional().isArray({ min: 1 }),
  body("ticketTypes.*.name").optional().isString().notEmpty(),
  body("ticket_types.*.name").optional().isString().notEmpty(),
  body("ticketTypes.*.price").optional().isFloat({ min: 0 }),
  body("ticket_types.*.price").optional().isFloat({ min: 0 }),
  body("ticketTypes.*.quota").optional().isInt({ min: 0 }),
  body("ticket_types.*.quota").optional().isInt({ min: 0 }),
  body("ticketTypes.*.sold").optional().isInt({ min: 0 }),
  body("ticket_types.*.sold").optional().isInt({ min: 0 }),
  body("ticketTypes.*.saleStartAt").optional().custom(validateDateTimeValue),
  body("ticketTypes.*.sale_start_at").optional().custom(validateDateTimeValue),
  body("ticketTypes.*.saleEndAt").optional().custom(validateDateTimeValue),
  body("ticketTypes.*.sale_end_at").optional().custom(validateDateTimeValue),
  body("ticket_types.*.saleStartAt").optional().custom(validateDateTimeValue),
  body("ticket_types.*.sale_start_at").optional().custom(validateDateTimeValue),
  body("ticket_types.*.saleEndAt").optional().custom(validateDateTimeValue),
  body("ticket_types.*.sale_end_at").optional().custom(validateDateTimeValue),
  validateRequest
];

const eventDeleteValidators = [param("id").isUUID(), validateRequest];

router.get("/", optionalAuthenticate, controller.listEvents);
router.get(
  "/me/purchased",
  [queryValidator("userId").isUUID(), validateRequest],
  controller.listPurchasedEvents
);
router.get("/me", authenticate, controller.listMyEvents);
router.get("/trending", controller.trendingEvents);
router.get("/explore", controller.exploreEvents);
router.get("/recommended", controller.recommendedEvents);
router.get("/interest", controller.interestEvents);
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

router.patch("/:id", authenticate, eventUpdateValidators, controller.updateEvent);
router.put("/:id", authenticate, eventUpdateValidators, controller.updateEvent);
router.delete("/:id", authenticate, eventDeleteValidators, controller.deleteEvent);

export default router;
