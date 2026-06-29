import express from "express";
import {
  createStory,
  getStories,
  viewStory,
  toggleLikeStory,
  commentStory,
  deleteComment,
} from "../controllers/storyController.js";
import { uploadSingleStoryMedia } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post("/", uploadSingleStoryMedia, createStory);
router.get("/", getStories);
router.post("/:storyId/view", viewStory);
router.post("/:storyId/like", toggleLikeStory);
router.post("/:storyId/comment", commentStory);
router.delete("/:storyId/comment/:commentId", deleteComment);

export default router;
