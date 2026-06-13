import express from "express";
import { param } from "express-validator";
import validateRequest from "../../middlewares/validateRequest.js";
import controller from "./creator.controller.js";

const router = express.Router();

router.get("/:id", [param("id").isUUID(), validateRequest], controller.getCreator);

export default router;
