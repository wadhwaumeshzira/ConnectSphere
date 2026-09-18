import crypto from 'crypto';
import Room from '../models/Room.js';

export const createRoom = async (req, res, next) => {
  try {
    const hostUserId = req.userId; // Provided by requireAuth middleware
    
    // Generate a unique 8-character room code
    let roomCode;
    let isUnique = false;
    while (!isUnique) {
      roomCode = crypto.randomBytes(4).toString('hex');
      const existing = await Room.findOne({ roomCode });
      if (!existing) isUnique = true;
    }

    const room = await Room.create({
      roomCode,
      hostUserId,
      isActive: true
    });

    res.status(201).json({
      roomCode: room.roomCode,
      hostUserId: room.hostUserId,
      createdAt: room.createdAt
    });
  } catch (error) {
    next(error);
  }
};

export const getRoom = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    
    const room = await Room.findOne({ roomCode, isActive: true });
    if (!room) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Room not found or is inactive' }
      });
    }

    res.status(200).json({
      roomCode: room.roomCode,
      isActive: room.isActive,
      hostUserId: room.hostUserId
    });
  } catch (error) {
    next(error);
  }
};
