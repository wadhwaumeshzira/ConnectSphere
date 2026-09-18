import { Router } from 'express';
import { createRoom, getRoom } from '../controllers/roomController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Create room requires auth
router.post('/', requireAuth, createRoom);

// Get room details (can be public for guests to check if room is valid before joining)
router.get('/:roomCode', getRoom);

export default router;
