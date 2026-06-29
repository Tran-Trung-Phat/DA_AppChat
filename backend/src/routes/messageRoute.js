import express from 'express';

import {
  editMessage,
  revokeMessage,
  searchMessages,
  sendDirectMessage,
  sendGroupMessage,
  reactMessage

} from '../controllers/messageController.js';
import { checkFriendship, checkGroupMembership } from '../middlewares/friendMiddleware.js';
import { uploadMessageAttachments } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.get('/search', searchMessages);
router.post('/direct', uploadMessageAttachments, checkFriendship, sendDirectMessage);
router.post('/group', uploadMessageAttachments, checkGroupMembership, sendGroupMessage);
router.patch('/:messageId', editMessage);
router.patch('/:messageId/react', reactMessage);
router.delete('/:messageId', revokeMessage);

export default router;
