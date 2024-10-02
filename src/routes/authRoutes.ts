import express, { RequestHandler } from 'express';
import { deleteUser, forgotPassword, getRecentUsers, login, resetPassword, searchUserByUsername, signup, updateUser, verifyEmail, verifyLoginOTP, verifyResetOTP } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();
router.get('/recent-users', authenticateToken as RequestHandler, getRecentUsers as RequestHandler);
router.get('/user/search', authenticateToken as RequestHandler, searchUserByUsername as RequestHandler);
router.post('/signup', signup as RequestHandler);
router.post('/login', login as RequestHandler);
router.post('/verify-login-otp', verifyLoginOTP as RequestHandler);
router.post('/forgot-password', forgotPassword as RequestHandler);
router.post('/verify-otp', verifyEmail as RequestHandler);
router.post('/verify-reset-otp', verifyResetOTP as RequestHandler);
router.post('/reset-password', resetPassword as RequestHandler);
router.put('/user', authenticateToken as RequestHandler, updateUser);
router.delete('/user', authenticateToken as RequestHandler, deleteUser);

export default router;
