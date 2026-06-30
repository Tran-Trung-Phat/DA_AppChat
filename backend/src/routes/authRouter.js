import express from 'express';
import dotenv from 'dotenv';
import {
  signUp,
  signIn,
  signOut,
  refresh,
  changePassword,
  forgotPassword,
  resetPassword,
  googleSignIn,
} from '../controllers/authController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/signout", signOut);
router.post("/refresh", refresh);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/google", googleSignIn);

// Protected routes (cần đăng nhập)
router.post("/change-password", protectedRoute, changePassword);

export default router;