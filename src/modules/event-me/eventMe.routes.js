import express from "express";
import authenticate from "../../middlewares/authenticate.js";
import controller from "./eventMe.controller.js";

const router = express.Router();

router.get("/me", authenticate, controller.getMyEvents);
router.get("/me/purchased", authenticate, controller.getMyPurchasedEvents);

export default router;
