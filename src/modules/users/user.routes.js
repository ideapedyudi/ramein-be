import express from "express";
import { body  } from "express-validator";
import authenticate from "../../middlewares/authenticate.js";
import authorize from "../../middlewares/authorize.js";
import validateRequest from "../../middlewares/validateRequest.js";
import userController from "./user.controller.js";

const router = express.Router();

router.get("/me", authenticate, userController.getMe);
router.patch(
  "/me",
  authenticate,
  [body("name").optional().isString(), body("phone").optional().isString(), validateRequest],
  userController.updateMe
);
router.get("/admin/list", authenticate, authorize("admin"), userController.listUsers);

export default router;
