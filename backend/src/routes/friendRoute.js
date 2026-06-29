import express from 'express';

import {
  acceptFriendRequest,
  sendFriendRequest,
  declineFriendRequest,
  getAllFriends,
  getFriendRequests,
  unfriend,
  cancelFriendRequest,
  blockUser,
  unblockUser,
  getBlockedUsers,

} from '../controllers/friendController.js';

const router =express.Router();

router.post('/request',sendFriendRequest);

router.post('/request/:requestId/accept',acceptFriendRequest);

router.post('/request/:requestId/decline',declineFriendRequest);

router.delete('/request/:requestId/cancel', cancelFriendRequest);

router.delete('/:friendId', unfriend);

router.get('/',getAllFriends);

router.get('/requests',getFriendRequests);

router.get('/blocked', getBlockedUsers);

router.post('/block/:userId', blockUser);

router.post('/unblock/:userId', unblockUser);

export default router;