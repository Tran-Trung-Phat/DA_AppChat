import express from 'express';
import { authMe, searchUsers, test, updateMe, uploadMeAvatar } from '../controllers/userController.js';
import { uploadSingleAvatar } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.get("/me", authMe);

router.patch("/me", updateMe);

router.post("/me/avatar", uploadSingleAvatar, uploadMeAvatar);

router.get("/", searchUsers);

router.get("/test",test);

export default router;
