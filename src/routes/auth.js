import { Router } from "express";
import {
  changePassword,
  deleteAccount,
  getMe,
  Login,
  resendOtp,
  SignUp,
  updateProfile,
  verifyOtp,
} from "../controllers/auth.js";
import { upload, validateUploadedImages } from "../configs/cloudinary.js";
import {
  forgotPassword,
  resetPassword,
  verifyResetOtp,
} from "../controllers/password.js";
import { protect } from "../middlewares/authMiddleware.js";
import { createSensitiveRateLimiter } from "../middlewares/rateLimitMiddleware.js";

const route = Router();

const fifteenMinutes = 15 * 60 * 1000;

route.post(
  "/signup",
  createSensitiveRateLimiter({
    max: 5,
    windowMs: 60 * 60 * 1000,
    byEmail: true,
  }),
  upload.single("image"),
  validateUploadedImages,
  SignUp,
);
route.post(
  "/verify-otp",
  createSensitiveRateLimiter({
    max: 10,
    windowMs: fifteenMinutes,
    byEmail: true,
  }),
  verifyOtp,
);
route.post(
  "/resend-otp",
  createSensitiveRateLimiter({
    max: 3,
    windowMs: fifteenMinutes,
    byEmail: true,
  }),
  resendOtp,
);

route.post(
  "/login",
  createSensitiveRateLimiter({
    max: 10,
    windowMs: fifteenMinutes,
    byEmail: true,
  }),
  Login,
);
route.post(
  "/forgot-password",
  createSensitiveRateLimiter({
    max: 3,
    windowMs: fifteenMinutes,
    byEmail: true,
  }),
  forgotPassword,
);
route.post(
  "/verify-reset-otp",
  createSensitiveRateLimiter({
    max: 10,
    windowMs: fifteenMinutes,
    byEmail: true,
  }),
  verifyResetOtp,
);
route.post(
  "/reset-password",
  createSensitiveRateLimiter({
    max: 5,
    windowMs: fifteenMinutes,
    byEmail: true,
  }),
  resetPassword,
);

route.get("/me", protect, getMe);

route.patch(
  "/profile",
  protect,
  upload.single("image"),
  validateUploadedImages,
  updateProfile,
);
route.patch("/password", protect, changePassword);
route.delete("/account", protect, deleteAccount);

export default route;
