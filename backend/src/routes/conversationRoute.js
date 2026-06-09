import express from 'express';
import {
  createConversation,
  getConversation,
  getMessages,
} from '../controllers/conversationController.js';
import { checkFriendship } from '../middlewares/friendMiddleware.js';

const router = express.Router();

router.post("/", checkFriendship, createConversation);
router.get("/", getConversation);
router.get("/:conversationId/messages", getMessages);

export default router;

