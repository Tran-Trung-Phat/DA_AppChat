import express from 'express';
import {
  authMe,
  searchUsers,
  test,
  updateMe,
  uploadMeAvatar,
  getUserProfile,
  uploadMeCover,
} from '../controllers/userController.js';
import { uploadSingleAvatar, uploadSingleCover } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.get("/me", authMe);

router.patch("/me", updateMe);

router.post("/me/avatar", uploadSingleAvatar, uploadMeAvatar);

router.post("/me/cover", uploadSingleCover, uploadMeCover);

router.get("/profile/:userId", getUserProfile);

router.get("/", searchUsers);

router.get("/test",test);

export default router;
