import express from 'express';

import {
  acceptFriendRequest,
  sendFriendRequest,
  declineFriendRequest,
  getAllFriends,
  getFriendRequests,

} from '../controllers/friendController.js';

const router =express.Router();

router.post('/request',sendFriendRequest);

router.post('/request/:requestId/accept',acceptFriendRequest);

router.post('/request/:requestId/decline',declineFriendRequest);

router.get('/',getAllFriends);

router.get('/requests',getFriendRequests);

export default router;