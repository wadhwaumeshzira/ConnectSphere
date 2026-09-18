import { useEffect, useState, useRef, useCallback } from 'react';

let ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
};

// Fetch premium TURN servers from Metered asynchronously
fetch("https://connectsphere.metered.live/api/v1/turn/credentials?apiKey=18dd77e5bc464252ed5bd43f7827f5a60d6c")
  .then(res => res.json())
  .then(servers => {
    // Append the premium servers to the existing STUN fallbacks
    ICE_SERVERS.iceServers = [...ICE_SERVERS.iceServers, ...servers];
    console.log("TURN Servers loaded successfully.");
  })
  .catch(err => console.error("Failed to load TURN servers", err));

export function useWebRTC(socket, roomCode, isJoined, micOn, cameraOn) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]); // [{ socketId, stream }]
  const [isMediaReady, setIsMediaReady] = useState(false);
  const peersRef = useRef(new Map());
  const candidateQueueRef = useRef({}); // socketId -> RTCIceCandidate[]

  // Initialize local stream
  useEffect(() => {
    if (!isJoined) return;
    let stream = null;

    const initMedia = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        
        // Initial hardware toggle state
        stream.getAudioTracks().forEach(t => t.enabled = micOn);
        stream.getVideoTracks().forEach(t => t.enabled = cameraOn);
        
        setLocalStream(stream);
        setIsMediaReady(true);
      } catch (err) {
        console.error("Failed to get local media", err);
        setIsMediaReady(true); // Still ready to join even if no media
      }
    };

    initMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJoined]); // Intentionally run only when joined

  // Toggle hardware when state changes
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = micOn);
    }
  }, [micOn, localStream]);

  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = cameraOn);
    }
  }, [cameraOn, localStream]);

  // Clean up a specific peer
  const removePeer = useCallback((socketId) => {
    const peer = peersRef.current.get(socketId);
    if (peer) {
      peer.close();
      peersRef.current.delete(socketId);
    }
    setRemoteStreams(prev => prev.filter(s => s.socketId !== socketId));
  }, []);

  // WebRTC Signaling Logic
  useEffect(() => {
    if (!socket) return;

    const createPeerConnection = (targetSocketId) => {
      const peer = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks if available
      if (localStream) {
        localStream.getTracks().forEach(track => {
          peer.addTrack(track, localStream);
        });
      }

      // Handle ICE candidates
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            roomCode,
            toSocketId: targetSocketId,
            candidate: event.candidate,
          });
        }
      };

      // Handle incoming streams
      peer.ontrack = (event) => {
        setRemoteStreams(prev => {
          // Replace if already exists (sometimes multiple tracks trigger this)
          const filtered = prev.filter(s => s.socketId !== targetSocketId);
          return [...filtered, { socketId: targetSocketId, stream: event.streams[0] }];
        });
      };

      // Cleanup on disconnect
      peer.oniceconnectionstatechange = () => {
        if (peer.iceConnectionState === 'failed' || peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'closed') {
          removePeer(targetSocketId);
        }
      };

      peersRef.current.set(targetSocketId, peer);
      return peer;
    };

    const processCandidateQueue = async (targetSocketId, peer) => {
      const queue = candidateQueueRef.current[targetSocketId];
      if (queue && queue.length > 0) {
        for (const candidate of queue) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Error adding queued ice candidate", err);
          }
        }
        candidateQueueRef.current[targetSocketId] = [];
      }
    };

    const handleUserJoined = async (participant) => {
      // Existing user creates offer to the newly joined user
      const peer = createPeerConnection(participant.socketId);
      try {
        const offer = await peer.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await peer.setLocalDescription(offer);
        socket.emit('offer', {
          roomCode,
          toSocketId: participant.socketId,
          sdp: offer,
        });
      } catch (err) {
        console.error("Error creating offer", err);
      }
    };

    const handleOffer = async ({ fromSocketId, sdp }) => {
      const peer = createPeerConnection(fromSocketId);
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        await processCandidateQueue(fromSocketId, peer);
        
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit('answer', {
          roomCode,
          toSocketId: fromSocketId,
          sdp: answer,
        });
      } catch (err) {
        console.error("Error handling offer", err);
      }
    };

    const handleAnswer = async ({ fromSocketId, sdp }) => {
      const peer = peersRef.current.get(fromSocketId);
      if (peer) {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(sdp));
          await processCandidateQueue(fromSocketId, peer);
        } catch (err) {
          console.error("Error handling answer", err);
        }
      }
    };

    const handleIceCandidate = async ({ fromSocketId, candidate }) => {
      const peer = peersRef.current.get(fromSocketId);
      if (peer) {
        if (peer.remoteDescription) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Error adding ice candidate", err);
          }
        } else {
          // Queue candidate until remote description is set
          if (!candidateQueueRef.current[fromSocketId]) {
            candidateQueueRef.current[fromSocketId] = [];
          }
          candidateQueueRef.current[fromSocketId].push(candidate);
        }
      } else {
        // Queue candidate before peer is even created (rare but possible)
        if (!candidateQueueRef.current[fromSocketId]) {
          candidateQueueRef.current[fromSocketId] = [];
        }
        candidateQueueRef.current[fromSocketId].push(candidate);
      }
    };

    const handleUserLeft = ({ socketId }) => {
      removePeer(socketId);
      delete candidateQueueRef.current[socketId];
    };

    socket.on('user-joined', handleUserJoined);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('user-joined', handleUserJoined);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, localStream, roomCode, removePeer]);

  // Cleanup all peers on unmount
  useEffect(() => {
    return () => {
      peersRef.current.forEach(peer => peer.close());
      peersRef.current.clear();
      candidateQueueRef.current = {};
      setRemoteStreams([]);
    };
  }, []);

  // Screen share logic
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const toggleScreenShare = useCallback(async () => {
    if (!localStream) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Handle native 'stop sharing' button
        screenTrack.onended = async () => {
          // Revert to camera
          try {
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const cameraTrack = cameraStream.getVideoTracks()[0];
            cameraTrack.enabled = cameraOn;
            
            peersRef.current.forEach(peer => {
              const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video');
              if (sender) sender.replaceTrack(cameraTrack);
            });
            
            setLocalStream(prev => {
              const audioTrack = prev?.getAudioTracks()[0];
              const tracks = audioTrack ? [audioTrack, cameraTrack] : [cameraTrack];
              return new MediaStream(tracks.filter(Boolean));
            });
            setIsScreenSharing(false);
          } catch (e) {
            console.error(e);
          }
        };

        // Replace track for all existing peers
        peersRef.current.forEach(peer => {
          const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        setLocalStream(prev => {
          const audioTrack = prev?.getAudioTracks()[0];
          const tracks = audioTrack ? [audioTrack, screenTrack] : [screenTrack];
          return new MediaStream(tracks.filter(Boolean));
        });
        setIsScreenSharing(true);
        return true; // Success
      } catch (err) {
        console.error("Failed to start screen share", err);
        return false;
      }
    } else {
      // Revert to camera
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const cameraTrack = cameraStream.getVideoTracks()[0];
        cameraTrack.enabled = cameraOn;

        peersRef.current.forEach(peer => {
          const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(cameraTrack);
        });

        // Stop the screen track
        localStream.getVideoTracks().forEach(t => t.stop());
        
        setLocalStream(prev => {
          const audioTrack = prev?.getAudioTracks()[0];
          const tracks = audioTrack ? [audioTrack, cameraTrack] : [cameraTrack];
          return new MediaStream(tracks.filter(Boolean));
        });
        setIsScreenSharing(false);
        return false; // Stopped
      } catch (err) {
        console.error("Failed to revert to camera", err);
        return null;
      }
    }
  }, [localStream, isScreenSharing, cameraOn]);

  return { localStream, remoteStreams, isScreenSharing, toggleScreenShare, isMediaReady };
}
