import express from "express";
import { body } from "express-validator";
import validateRequest from "../../middlewares/validateRequest.js";
import controller from "./eventChat.controller.js";

const router = express.Router();

router.post(
  "/",
  [
    body("message").isString().notEmpty(),
    body("visitorName").optional().isString().notEmpty(),
    validateRequest
  ],
  controller.chat
);

export default router;
