import express, { RequestHandler } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  sendFriendRequest,
  respondToFriendRequest,
  createPost,
  updatePost,
  deletePost,
  likePost,
  commentOnPost,
  cancelFriendRequest,
  getAllPosts,
  getUserPosts,
  getActivityFeed
} from '../controllers/userController';

const router = express.Router();


router.get('/activity-feed', authenticateToken as RequestHandler, getActivityFeed as RequestHandler);
router.get('/posts/user/:username', authenticateToken as RequestHandler, getUserPosts as RequestHandler);
router.post('/friend-request', authenticateToken as RequestHandler, sendFriendRequest);
router.put('/friend-request/:requestId', authenticateToken as RequestHandler, respondToFriendRequest);

router.post('/posts', authenticateToken as RequestHandler, createPost);
router.put('/posts/:postId', authenticateToken as RequestHandler, updatePost);
router.delete('/posts/:postId', authenticateToken as RequestHandler, deletePost);
router.post('/posts/:postId/like', authenticateToken as RequestHandler, likePost);
router.post('/posts/:postId/comment', authenticateToken as RequestHandler, commentOnPost);
router.delete('/friend-request/:requestId', authenticateToken as RequestHandler, cancelFriendRequest as RequestHandler);


export default router;
