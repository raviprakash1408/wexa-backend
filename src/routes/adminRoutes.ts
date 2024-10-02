import express, { RequestHandler } from 'express';
import { isAdmin } from '../middleware/adminMiddleware';
import { getAllUsers, restrictUser } from '../controllers/adminController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/users', authenticateToken as RequestHandler, isAdmin, getAllUsers);
router.put('/users/:id/restrict', authenticateToken as RequestHandler, isAdmin, restrictUser);

export default router;
