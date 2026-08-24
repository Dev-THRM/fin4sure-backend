import express from "express";
import {
  SendOTP,
  signUpHandler,
  verifyOTP,
  loginHandler,
  profileHandler,
  Logouthandaler,
  sendUpdateNumberOTP,
  verifyUpdateNumberOTP,
  profileUpdateHandeler,
  registerBorrowerHandler,
  adminLoginHandler,
  // Email OTP handlers
  SendEmailOTP,
  VerifyEmailOTP,
  OTPLoginHandler,
} from "../controllers/auth.controller.js";
import { verifyUser } from "../middlewares/auth.middleware.js"; // protects routes

const authRouter = express.Router();

// -------------------- Auth routes --------------------
// Public routes
authRouter.post("/signup", signUpHandler);       // Signup
authRouter.post("/send-otp", SendOTP);          // Send OTP (mobile) — kept for future re-use
authRouter.post("/verify-otp", verifyOTP);      // Verify OTP (mobile) — kept for future re-use
authRouter.post("/login", loginHandler);        // Password-based login
authRouter.post("/admin-login", adminLoginHandler); // Admin static login
authRouter.post("/register-borrower", registerBorrowerHandler); // Register borrower

// Email OTP (passwordless login via Resend)
authRouter.post("/send-email-otp", SendEmailOTP);        // Send OTP to email
authRouter.post("/verify-email-otp", VerifyEmailOTP);    // Verify OTP only (no session)
authRouter.post("/otp-login", OTPLoginHandler);          // Verify OTP + issue JWT (passwordless login)

// Protected routes (require login)
authRouter.post("/logout", verifyUser, Logouthandaler);            // Logout
authRouter.get("/profile", verifyUser, profileHandler);            // Get profile
authRouter.post("/update-number-otp", verifyUser, sendUpdateNumberOTP); // Send OTP for number update
authRouter.post("/verify-update-number-otp", verifyUser, verifyUpdateNumberOTP); // Verify OTP for number update
authRouter.patch("/profileupdate", verifyUser, profileUpdateHandeler);

export default authRouter;