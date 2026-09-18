import Room from '../models/Room.js';

// Simple in-memory state for v1. 
const roomParticipants = new Map(); // roomCode -> Map(socketId -> { socketId, displayName })

export default (io, socket) => {
  socket.on('join-room', async (payload) => {
    try {
      const { roomCode, displayName } = payload;
      
      const room = await Room.findOne({ roomCode, isActive: true });
      if (!room) {
        return socket.emit('error', { error: { code: 'NOT_FOUND', message: 'Room not found' } });
      }

      // Check max participants (v1 limit: 6)
      const participants = roomParticipants.get(roomCode) || new Map();
      if (participants.size >= 6) {
        return socket.emit('error', { error: { code: 'ROOM_FULL', message: 'Room is full (max 6 participants)' } });
      }

      socket.join(roomCode);

      const participant = { 
        socketId: socket.id, 
        displayName,
        isHost: socket.userId && room.hostUserId.toString() === socket.userId.toString()
      };
      participants.set(socket.id, participant);
      roomParticipants.set(roomCode, participants);

      // Notify others in room
      socket.to(roomCode).emit('user-joined', participant);

      // Send current participants to the joining user
      socket.emit('room-participants', {
        participants: Array.from(participants.values())
      });

    } catch (err) {
      socket.emit('error', { error: { code: 'SERVER_ERROR', message: 'Failed to join room' } });
    }
  });

  socket.on('chat-message', (payload) => {
    const { roomCode, text } = payload;
    const participants = roomParticipants.get(roomCode);
    if (!participants || !participants.has(socket.id)) return;
    
    const sender = participants.get(socket.id);
    
    io.to(roomCode).emit('chat-message', {
      senderName: sender.displayName,
      text,
      timestamp: new Date()
    });
  });

  socket.on('leave-room', (payload) => {
    handleLeave(io, socket, payload.roomCode);
  });

  // WebRTC Signaling Relays
  socket.on('offer', (payload) => {
    const { roomCode, toSocketId, sdp } = payload;
    socket.to(toSocketId).emit('offer', {
      fromSocketId: socket.id,
      sdp
    });
  });

  socket.on('answer', (payload) => {
    const { roomCode, toSocketId, sdp } = payload;
    socket.to(toSocketId).emit('answer', {
      fromSocketId: socket.id,
      sdp
    });
  });

  socket.on('ice-candidate', (payload) => {
    const { roomCode, toSocketId, candidate } = payload;
    socket.to(toSocketId).emit('ice-candidate', {
      fromSocketId: socket.id,
      candidate
    });
  });

  socket.on('toggle-media', (payload) => {
    const { roomCode, kind, enabled } = payload;
    socket.to(roomCode).emit('toggle-media', {
      socketId: socket.id,
      kind,
      enabled
    });
  });

  socket.on('private-message', (payload) => {
    const { roomCode, toSocketId, text } = payload;
    const participants = roomParticipants.get(roomCode);
    if (!participants || !participants.has(socket.id)) return;
    
    const sender = participants.get(socket.id);
    
    // Send to target
    socket.to(toSocketId).emit('private-message', {
      senderName: sender.displayName,
      senderSocketId: socket.id,
      text,
      timestamp: new Date()
    });
    // Echo back to sender
    socket.emit('private-message', {
      senderName: sender.displayName,
      toSocketId,
      isSentByMe: true,
      text,
      timestamp: new Date()
    });
  });

  socket.on('hand-raise', (payload) => {
    const { roomCode, isRaised } = payload;
    socket.to(roomCode).emit('hand-raise', {
      socketId: socket.id,
      isRaised
    });
  });

  socket.on('force-mute', async (payload) => {
    const { roomCode, toSocketId } = payload;
    try {
      const room = await Room.findOne({ roomCode, isActive: true });
      if (room && socket.userId && room.hostUserId.toString() === socket.userId.toString()) {
        socket.to(toSocketId).emit('force-mute');
      }
    } catch(e) { console.error(e); }
  });

  socket.on('remove-user', async (payload) => {
    const { roomCode, toSocketId } = payload;
    try {
      const room = await Room.findOne({ roomCode, isActive: true });
      if (room && socket.userId && room.hostUserId.toString() === socket.userId.toString()) {
        socket.to(toSocketId).emit('kicked');
        const targetSocket = io.sockets.sockets.get(toSocketId);
        if (targetSocket) {
          handleLeave(io, targetSocket, roomCode);
          targetSocket.leave(roomCode);
        }
      }
    } catch(e) { console.error(e); }
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        handleLeave(io, socket, room);
      }
    }
  });
};

function handleLeave(io, socket, roomCode) {
  const participants = roomParticipants.get(roomCode);
  if (participants && participants.has(socket.id)) {
    participants.delete(socket.id);
    if (participants.size === 0) {
      roomParticipants.delete(roomCode);
    } else {
      roomParticipants.set(roomCode, participants);
    }
    io.to(roomCode).emit('user-left', { socketId: socket.id });
  }
}
