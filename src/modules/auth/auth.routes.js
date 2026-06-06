import express from "express";
import { body  } from "express-validator";
import validateRequest from "../../middlewares/validateRequest.js";
import authController from "./auth.controller.js";

const router = express.Router();

const googleAuthValidators = [
  body().custom((value) => {
    if (value?.idToken || value?.credential) return true;
    throw new Error("idToken or credential is required");
  }),
  body("idToken").optional().isString(),
  body("credential").optional().isString(),
  validateRequest
];

router.post(
  "/first-user",
  [
    body("name").notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    validateRequest
  ],
  authController.createFirstUser
);

router.post(
  "/register",
  [
    body("name").notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    validateRequest
  ],
  authController.register
);

router.post(
  "/login",
  [body("email").isEmail(), body("password").notEmpty(), validateRequest],
  authController.login
);

router.post("/google", googleAuthValidators, authController.googleAuth);
router.post("/google/register", googleAuthValidators, authController.googleAuth);
router.post("/google/login", googleAuthValidators, authController.googleAuth);

router.post(
  "/refresh-token",
  [body("refreshToken").notEmpty(), validateRequest],
  authController.refreshToken
);

router.post("/logout", authController.logout);

export default router;
