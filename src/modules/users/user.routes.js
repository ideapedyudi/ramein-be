import express from "express";
import { body  } from "express-validator";
import authenticate from "../../middlewares/authenticate.js";
import authorize from "../../middlewares/authorize.js";
import validateRequest from "../../middlewares/validateRequest.js";
import userController from "./user.controller.js";

const router = express.Router();

const createAdminValidators = [
  body("name").notEmpty(),
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  body("phone").optional().isString(),
  validateRequest
];

router.get("/me", authenticate, userController.getMe);
router.patch(
  "/me",
  authenticate,
  [body("name").optional().isString(), body("phone").optional().isString(), validateRequest],
  userController.updateMe
);
router.get("/admin/list", authenticate, authorize("admin"), userController.listUsers);
router.get("/admin/admins", authenticate, authorize("admin"), userController.listAdmins);
router.post("/admin/admins", authenticate, authorize("admin"), createAdminValidators, userController.createAdmin);
router.get("/admin/users", authenticate, authorize("admin"), userController.listRoleUsers);

export default router;
