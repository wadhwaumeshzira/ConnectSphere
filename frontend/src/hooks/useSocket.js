import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useSocket(roomCode, displayName, isJoined) {
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [participantMedia, setParticipantMedia] = useState({}); // socketId -> { audio: true, video: true }

  const [raisedHands, setRaisedHands] = useState(new Set());

  useEffect(() => {
    if (!isJoined) return;

    const token = localStorage.getItem('accessToken');
    const authPayload = token ? { token } : { guestName: displayName };

    // Get the base URL by stripping /api from the VITE_API_URL, or use default
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || `${window.location.protocol}//${window.location.hostname}:3000`;

    const socketIo = io(baseUrl, {
      auth: authPayload
    });

    socketIo.on('connect', () => {
      window.dispatchEvent(new CustomEvent('socket-connected'));
    });

    socketIo.on('room-participants', (payload) => {
      setParticipants(payload.participants);
      const media = {};
      payload.participants.forEach(p => {
        media[p.socketId] = { audio: true, video: true };
      });
      setParticipantMedia(media);
    });

    socketIo.on('user-joined', (participant) => {
      setParticipants(prev => {
        if (prev.find(p => p.socketId === participant.socketId)) return prev;
        return [...prev, participant];
      });
      setParticipantMedia(prev => ({
        ...prev,
        [participant.socketId]: { audio: true, video: true }
      }));
    });

    socketIo.on('user-left', ({ socketId }) => {
      setParticipants(prev => prev.filter(p => p.socketId !== socketId));
      setParticipantMedia(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      setRaisedHands(prev => {
        const next = new Set(prev);
        next.delete(socketId);
        return next;
      });
    });

    socketIo.on('chat-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socketIo.on('private-message', (msg) => {
      setMessages(prev => [...prev, { ...msg, isPrivate: true }]);
    });

    socketIo.on('hand-raise', ({ socketId, isRaised }) => {
      setRaisedHands(prev => {
        const next = new Set(prev);
        if (isRaised) next.add(socketId);
        else next.delete(socketId);
        return next;
      });
    });

    socketIo.on('kicked', () => {
      alert("You have been removed from the meeting by the Host.");
      window.location.href = '/';
    });

    socketIo.on('force-mute', () => {
      // The local user's component needs to know this. 
      // We will dispatch a custom event or we can handle it via state if we bubble it up.
      // Easiest is to dispatch a DOM event that Room.jsx listens to.
      window.dispatchEvent(new CustomEvent('force-mute-local'));
    });

    socketIo.on('toggle-media', ({ socketId, kind, enabled }) => {
      setParticipantMedia(prev => ({
        ...prev,
        [socketId]: {
          ...(prev[socketId] || { audio: true, video: true }),
          [kind]: enabled
        }
      }));
    });

    socketIo.on('error', (err) => {
      try {
        const parsed = typeof err === 'string' ? JSON.parse(err) : err;
        setError(parsed.error?.message || 'Socket error');
      } catch (e) {
        setError(err.error?.message || 'Socket error');
      }
    });

    socketIo.on('connect_error', (err) => {
      try {
        const parsed = JSON.parse(err.message);
        setError(parsed.error?.message || 'Connection failed');
      } catch (e) {
        setError(err.message || 'Connection failed');
      }
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, [isJoined, roomCode, displayName]);

  const sendMessage = useCallback((text, toSocketId = null) => {
    if (socket) {
      if (toSocketId) {
        socket.emit('private-message', { roomCode, text, toSocketId });
      } else {
        socket.emit('chat-message', { roomCode, text });
      }
    }
  }, [socket, roomCode]);

  const sendMediaToggle = useCallback((kind, enabled) => {
    if (socket) {
      socket.emit('toggle-media', { roomCode, kind, enabled });
    }
  }, [socket, roomCode]);

  const toggleHandRaise = useCallback((isRaised) => {
    if (socket) {
      socket.emit('hand-raise', { roomCode, isRaised });
      setRaisedHands(prev => {
        const next = new Set(prev);
        if (isRaised) next.add(socket.id);
        else next.delete(socket.id);
        return next;
      });
    }
  }, [socket, roomCode]);

  const forceMute = useCallback((toSocketId) => {
    if (socket) {
      socket.emit('force-mute', { roomCode, toSocketId });
    }
  }, [socket, roomCode]);

  const removeUser = useCallback((toSocketId) => {
    if (socket) {
      socket.emit('remove-user', { roomCode, toSocketId });
    }
  }, [socket, roomCode]);

  return { 
    socket, 
    participants, 
    messages, 
    participantMedia, 
    raisedHands,
    sendMessage, 
    sendMediaToggle,
    toggleHandRaise,
    forceMute,
    removeUser,
    error 
  };
}
