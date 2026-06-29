import express from 'express';
import {
  createConversation,
  getConversation,
  getMessages,
  markConversationRead,
  updateGroupInfo,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
} from '../controllers/conversationController.js';
import {
  checkConversationMembership,
  checkFriendship,
} from '../middlewares/friendMiddleware.js';

const router = express.Router();

router.post('/', checkFriendship, createConversation);
router.get('/', getConversation);
router.get('/:conversationId/messages', checkConversationMembership, getMessages);
router.patch('/:conversationId/read', checkConversationMembership, markConversationRead);
router.patch('/:conversationId/group', checkConversationMembership, updateGroupInfo);
router.post('/:conversationId/group/members', checkConversationMembership, addGroupMembers);
router.delete('/:conversationId/group/members/:userId', checkConversationMembership, removeGroupMember);
router.post('/:conversationId/group/leave', checkConversationMembership, leaveGroup);

export default router;