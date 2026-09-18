import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import api from '../services/api';
import { Video, Mic, MicOff, VideoOff, AlertCircle, Send, Users, MessageSquare, PhoneOff, MonitorUp, Copy, Check, Hand, X, MoreVertical, Pin, PinOff } from 'lucide-react';

const VideoTile = ({ stream, isLocal, displayName, isAudioMuted, isVideoMuted, isHandRaised, isPinned, onTogglePin, isScreenSharing }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream && !isVideoMuted) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isVideoMuted]);

  return (
    <div className={`relative w-full h-full bg-surface border rounded-xl overflow-hidden flex items-center justify-center shadow-lg group ${isHandRaised ? 'border-accent border-2' : 'border-surfaceBorder'}`}>
      {stream && !isVideoMuted ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${(isLocal && !isScreenSharing) ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-20 h-20 bg-surfaceHighlight rounded-full flex items-center justify-center text-3xl font-semibold text-textSecondary">
          {displayName?.charAt(0).toUpperCase()}
        </div>
      )}
      
      <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium z-10">
        <span className="truncate max-w-[120px]">{displayName}</span>
        {isAudioMuted && <MicOff className="w-4 h-4 text-danger" />}
      </div>
      
      {/* Pin button overlay */}
      <button 
        onClick={onTogglePin}
        className={`absolute top-3 left-3 p-2 rounded-full z-10 backdrop-blur-sm transition-opacity ${isPinned ? 'bg-accent/90 text-white opacity-100' : 'bg-background/60 text-white opacity-0 group-hover:opacity-100 hover:bg-background/80'}`}
        title={isPinned ? "Unpin video" : "Pin video"}
      >
        {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
      </button>

      {isHandRaised && (
        <div className="absolute top-3 right-3 bg-accent/90 backdrop-blur-sm p-2 rounded-full z-10 shadow-lg animate-bounce">
          <Hand className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
};

export default function Room() {
  const { roomCode } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isValidating, setIsValidating] = useState(true);
  const [roomError, setRoomError] = useState('');
  
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [isJoined, setIsJoined] = useState(false);
  
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'participants'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  const { 
    participants, messages, participantMedia, raisedHands,
    sendMessage, sendMediaToggle, toggleHandRaise, forceMute, removeUser, 
    error: socketError, socket 
  } = useSocket(roomCode, displayName, isJoined);
  
  const { localStream, remoteStreams, isScreenSharing, toggleScreenShare, isMediaReady } = useWebRTC(socket, roomCode, isJoined, micOn, cameraOn);

  useEffect(() => {
    if (!isJoined || !socket || !isMediaReady) return;
    
    const join = () => {
      socket.emit('join-room', { roomCode, displayName });
    };

    // Join initially
    join();

    // Re-join if socket reconnects (e.g. dropped connection)
    window.addEventListener('socket-connected', join);
    return () => window.removeEventListener('socket-connected', join);
  }, [isJoined, socket, isMediaReady, roomCode, displayName]);

  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    const link = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [isHost, setIsHost] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [privateRecipient, setPrivateRecipient] = useState(null); // { socketId, displayName }
  const [pinnedSocketId, setPinnedSocketId] = useState(null); // 'local' or socketId

  useEffect(() => {
    const validateRoom = async () => {
      try {
        const res = await api.get(`/rooms/${roomCode}`);
        if (user && (user.id === res.data.hostUserId || user._id === res.data.hostUserId)) {
          setIsHost(true);
        }
        setIsValidating(false);
      } catch (err) {
        setRoomError('This meeting link is invalid or the room has been closed.');
        setIsValidating(false);
      }
    };
    validateRoom();
  }, [roomCode, user]);

  useEffect(() => {
    if (socket) {
      const handleForceMute = () => {
        setMicOn(false);
        sendMediaToggle('audio', false);
      };
      socket.on('force-mute', handleForceMute);
      return () => socket.off('force-mute', handleForceMute);
    }
  }, [socket, sendMediaToggle]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (displayName.trim()) {
      setIsJoined(true);
    }
  };

  const handleHandRaise = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    toggleHandRaise(nextState);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendMessage(chatInput.trim(), privateRecipient?.socketId);
      setChatInput('');
    }
  };

  const toggleMic = () => {
    setMicOn(!micOn);
    sendMediaToggle('audio', !micOn);
  };

  const toggleCamera = () => {
    setCameraOn(!cameraOn);
    sendMediaToggle('video', !cameraOn);
  };

  const handleToggleScreenShare = async () => {
    const isNowSharing = await toggleScreenShare();
    if (isNowSharing) {
      if (!cameraOn) {
        setCameraOn(true);
        sendMediaToggle('video', true);
      }
    } else if (isNowSharing === false) {
      // Stopped sharing, can optionally restore previous state, but leaving it as camera on is fine.
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2 text-textSecondary">
          <div className="w-2 h-2 bg-accent rounded-full"></div>
          <div className="w-2 h-2 bg-accent rounded-full animation-delay-200"></div>
          <div className="w-2 h-2 bg-accent rounded-full animation-delay-400"></div>
        </div>
      </div>
    );
  }

  if (roomError || socketError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-surface p-8 rounded-xl border border-surfaceBorder text-center max-w-md w-full">
          <div className="flex justify-center mb-4">
            <div className="bg-danger/10 p-3 rounded-full">
              <AlertCircle className="w-8 h-8 text-danger" />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Meeting unavailable</h2>
          <p className="text-textSecondary mb-6">{socketError || roomError}</p>
          <button onClick={() => navigate('/')} className="btn-primary w-full">
            Return to home
          </button>
        </div>
      </div>
    );
  }

  if (!isJoined) {
    // Lobby UI (unchanged)
    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8">
        <header className="mb-8 flex items-center gap-2">
          <Video className="w-6 h-6 text-accent" />
          <span className="text-lg font-medium">ConnectSphere</span>
        </header>
        <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 max-w-5xl mx-auto w-full">
          <div className="flex-1 w-full flex flex-col items-center">
            <div className="relative w-full aspect-video bg-surfaceHighlight rounded-xl overflow-hidden border border-surfaceBorder shadow-xl flex items-center justify-center">
              {cameraOn ? (
                <span className="text-textSecondary">Camera preview starting...</span>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center text-2xl font-semibold text-textSecondary border border-surfaceBorder">
                    {displayName.charAt(0).toUpperCase() || '?'}
                  </div>
                  <span className="text-textSecondary">Camera is off</span>
                </div>
              )}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setMicOn(!micOn)}
                  className={`p-3 rounded-full focus-ring transition-colors ${micOn ? 'bg-surface/80 hover:bg-surface text-white' : 'bg-danger hover:bg-danger/90 text-white'}`}
                >
                  {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
                <button 
                  type="button"
                  onClick={() => setCameraOn(!cameraOn)}
                  className={`p-3 rounded-full focus-ring transition-colors ${cameraOn ? 'bg-surface/80 hover:bg-surface text-white' : 'bg-danger hover:bg-danger/90 text-white'}`}
                >
                  {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
          <div className="w-full lg:w-[350px] bg-surface p-6 rounded-xl border border-surfaceBorder shadow-lg">
            <h1 className="text-2xl font-semibold mb-2">Ready to join?</h1>
            <p className="text-textSecondary mb-6 text-sm">Room code: <span className="font-mono bg-surfaceHighlight px-2 py-0.5 rounded text-textPrimary">{roomCode}</span></p>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1.5">
                  Display name
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                className="btn-primary w-full py-2.5"
                disabled={!displayName.trim()}
              >
                Join now
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // Determine grid columns and rows
  const totalTiles = participants.length || 1;
  let gridClasses = 'grid-cols-1 grid-rows-1';
  if (totalTiles === 2) gridClasses = 'grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1';
  else if (totalTiles >= 3 && totalTiles <= 4) gridClasses = 'grid-cols-2 grid-rows-2';
  else if (totalTiles >= 5) gridClasses = 'grid-cols-2 grid-rows-3 md:grid-cols-3 md:grid-rows-2';

  // Active Call UI
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      
      {/* Top Header */}
      <header className="h-14 border-b border-surfaceBorder bg-surface flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-accent" />
          <span className="font-semibold hidden sm:inline">ConnectSphere</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-textSecondary bg-surfaceHighlight px-3 py-1.5 rounded-md font-mono select-all">
            {roomCode}
          </span>
          <button 
            onClick={copyLink}
            className="flex items-center gap-1.5 text-sm font-medium bg-accent text-white px-3 py-1.5 rounded-md hover:bg-accentHover transition-colors focus-ring"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy link'}</span>
          </button>
        </div>
      </header>
      
      {/* Main Area */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Video Grid Area */}
        <div className="flex-1 p-4 relative flex items-center justify-center min-h-0 min-w-0">
          {pinnedSocketId ? (
            <div className="flex flex-col md:flex-row w-full h-full gap-4">
              <div className="flex-1 h-full min-h-0 min-w-0">
                {/* Pinned Video */}
                {pinnedSocketId === 'local' ? (
                  <VideoTile 
                    stream={localStream} 
                    isLocal={true} 
                    displayName={displayName + " (You)"}
                    isAudioMuted={!micOn}
                    isVideoMuted={!cameraOn}
                    isHandRaised={isHandRaised}
                    isPinned={true}
                    onTogglePin={() => setPinnedSocketId(null)}
                    isScreenSharing={isScreenSharing}
                  />
                ) : (
                  (() => {
                    const rs = remoteStreams.find(s => s.socketId === pinnedSocketId);
                    if (!rs) {
                      // If the pinned user left, auto unpin
                      setTimeout(() => setPinnedSocketId(null), 0);
                      return null;
                    }
                    const p = participants.find(p => p.socketId === rs.socketId);
                    const media = participantMedia[rs.socketId] || { audio: true, video: true };
                    return (
                      <VideoTile 
                        stream={rs.stream}
                        isLocal={false}
                        displayName={p?.displayName || 'Unknown'}
                        isAudioMuted={!media.audio}
                        isVideoMuted={!media.video}
                        isHandRaised={raisedHands.has(rs.socketId)}
                        isPinned={true}
                        onTogglePin={() => setPinnedSocketId(null)}
                      />
                    );
                  })()
                )}
              </div>
              <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-y-auto w-full md:w-64 h-48 md:h-full shrink-0">
                {/* Unpinned Videos */}
                {pinnedSocketId !== 'local' && (
                  <div className="w-40 md:w-full h-full md:h-40 shrink-0">
                    <VideoTile 
                      stream={localStream} 
                      isLocal={true} 
                      displayName={displayName + " (You)"}
                      isAudioMuted={!micOn}
                      isVideoMuted={!cameraOn}
                      isHandRaised={isHandRaised}
                      isPinned={false}
                      onTogglePin={() => setPinnedSocketId('local')}
                      isScreenSharing={isScreenSharing}
                    />
                  </div>
                )}
                {participants.filter(p => p.socketId !== socket?.id && p.socketId !== pinnedSocketId).map((participant) => {
                  const rs = remoteStreams.find(s => s.socketId === participant.socketId);
                  const media = participantMedia[participant.socketId] || { audio: true, video: true };
                  return (
                    <div key={participant.socketId} className="w-40 md:w-full h-full md:h-40 shrink-0">
                      <VideoTile 
                        stream={rs ? rs.stream : null}
                        isLocal={false}
                        displayName={participant.displayName}
                        isAudioMuted={!media.audio}
                        isVideoMuted={!media.video}
                        isHandRaised={raisedHands.has(participant.socketId)}
                        isPinned={false}
                        onTogglePin={() => setPinnedSocketId(participant.socketId)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={`w-full h-full max-h-full grid ${gridClasses} gap-4`}>
              
                <VideoTile 
                  stream={localStream} 
                  isLocal={true} 
                  displayName={displayName + " (You)"}
                  isAudioMuted={!micOn}
                  isVideoMuted={!cameraOn}
                  isHandRaised={isHandRaised}
                  isPinned={false}
                  onTogglePin={() => setPinnedSocketId('local')}
                  isScreenSharing={isScreenSharing}
                />

              {/* Remote Videos */}
              {participants.filter(p => p.socketId !== socket?.id).map((participant) => {
                const rs = remoteStreams.find(s => s.socketId === participant.socketId);
                const media = participantMedia[participant.socketId] || { audio: true, video: true };
                
                return (
                  <VideoTile 
                    key={participant.socketId}
                    stream={rs ? rs.stream : null}
                    isLocal={false}
                    displayName={participant.displayName}
                    isAudioMuted={!media.audio}
                    isVideoMuted={!media.video}
                    isHandRaised={raisedHands.has(participant.socketId)}
                    isPinned={false}
                    onTogglePin={() => setPinnedSocketId(participant.socketId)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        {isSidebarOpen && (
          <div className="w-80 border-l border-surfaceBorder bg-surface flex flex-col flex-shrink-0">
            <div className="flex border-b border-surfaceBorder">
            <button 
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 focus-ring ${activeTab === 'chat' ? 'text-textPrimary border-b-2 border-accent' : 'text-textSecondary hover:text-textPrimary'}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare className="w-4 h-4" /> Chat
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 focus-ring ${activeTab === 'participants' ? 'text-textPrimary border-b-2 border-accent' : 'text-textSecondary hover:text-textPrimary'}`}
              onClick={() => setActiveTab('participants')}
            >
              <Users className="w-4 h-4" /> People ({participants.length})
            </button>
          </div>

          {activeTab === 'chat' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <p className="text-textSecondary text-center text-sm mt-4">No messages yet. Say hello!</p>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className="flex flex-col">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-medium text-sm">{msg.senderName}</span>
                        {msg.isPrivate && <span className="text-[10px] uppercase bg-accent/20 text-accent px-1.5 rounded-sm font-semibold tracking-wider">Private</span>}
                        <span className="text-xs text-textSecondary">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-sm text-textPrimary/90 p-2.5 rounded-r-lg rounded-bl-lg w-fit max-w-[90%] break-words ${msg.isPrivate ? 'bg-accent/20 border border-accent/30' : 'bg-surfaceHighlight'}`}>
                        {msg.text}
                      </p>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="p-3 border-t border-surfaceBorder flex flex-col gap-2">
                {privateRecipient && (
                  <div className="flex items-center justify-between bg-surfaceHighlight px-2 py-1 rounded text-xs text-textSecondary">
                    <span>Replying privately to <strong>{privateRecipient.displayName}</strong></span>
                    <button onClick={() => setPrivateRecipient(null)} className="hover:text-textPrimary"><X className="w-3 h-3" /></button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input 
                    type="text"
                    placeholder={privateRecipient ? `Message ${privateRecipient.displayName}...` : "Send a message..."}
                    className="input-field py-2 text-sm"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button type="submit" disabled={!chatInput.trim()} className="btn-primary p-2 flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {participants.map((p, i) => (
                <div key={i} className="flex flex-col gap-2 p-2 rounded-lg hover:bg-surfaceHighlight group transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-semibold shrink-0">
                      {p.displayName.charAt(0).toUpperCase()}
                      {raisedHands.has(p.socketId) && <div className="absolute -top-1 -right-1 bg-accent rounded-full w-4 h-4 flex items-center justify-center"><Hand className="w-3 h-3 text-white" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-textPrimary truncate flex items-center gap-2">
                        <span>{p.displayName} {p.socketId === socket?.id ? '(You)' : ''}</span>
                        {p.isHost && <span className="text-[10px] uppercase bg-accent/20 text-accent px-1.5 py-0.5 rounded-sm font-semibold tracking-wider shrink-0">Admin</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {participantMedia[p.socketId] && !participantMedia[p.socketId].audio && (
                        <MicOff className="w-4 h-4 text-danger shrink-0" />
                      )}
                      
                      {/* Context Actions */}
                      {p.socketId !== socket?.id && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button 
                            onClick={() => {
                              setPrivateRecipient({ socketId: p.socketId, displayName: p.displayName });
                              setActiveTab('chat');
                            }}
                            className="p-1 hover:bg-surfaceBorder rounded text-textSecondary hover:text-textPrimary"
                            title="Private message"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          
                          {isHost && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => forceMute(p.socketId)} className="p-1 hover:bg-surfaceBorder rounded text-textSecondary hover:text-danger" title="Force mute">
                                <MicOff className="w-4 h-4" />
                              </button>
                              <button onClick={() => removeUser(p.socketId)} className="p-1 hover:bg-surfaceBorder rounded text-textSecondary hover:text-danger" title="Remove user">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        )}
      </main>

      {/* Control Bar */}
      <footer className="h-20 border-t border-surfaceBorder bg-background flex items-center justify-center gap-4 shrink-0 px-4 z-20 relative">
        <button 
          onClick={toggleMic}
          className={`p-3.5 rounded-full focus-ring transition-colors ${micOn ? 'bg-surfaceHighlight hover:bg-surfaceBorder text-white' : 'bg-danger hover:bg-danger/90 text-white'}`}
          title={micOn ? "Turn off mic" : "Turn on mic"}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <button 
          onClick={toggleCamera}
          className={`p-3.5 rounded-full focus-ring transition-colors ${cameraOn ? 'bg-surfaceHighlight hover:bg-surfaceBorder text-white' : 'bg-danger hover:bg-danger/90 text-white'}`}
          title={cameraOn ? "Turn off camera" : "Turn on camera"}
        >
          {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button 
          onClick={handleHandRaise}
          className={`p-3.5 rounded-full focus-ring transition-colors ${isHandRaised ? 'bg-accent text-white hover:bg-accentHover' : 'bg-surfaceHighlight hover:bg-surfaceBorder text-white'}`}
          title={isHandRaised ? "Lower hand" : "Raise hand"}
        >
          <Hand className="w-5 h-5" />
        </button>
        <button 
          onClick={handleToggleScreenShare}
          className={`p-3.5 rounded-full focus-ring transition-colors ${isScreenSharing ? 'bg-accent text-white hover:bg-accentHover' : 'bg-surfaceHighlight hover:bg-surfaceBorder text-white'}`}
          title={isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          <MonitorUp className="w-5 h-5" />
        </button>
        
        {/* Toggle Sidebar Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`p-3.5 rounded-full focus-ring transition-colors ${isSidebarOpen ? 'bg-accent text-white hover:bg-accentHover' : 'bg-surfaceHighlight hover:bg-surfaceBorder text-white'}`}
          title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        <button 
          onClick={() => {
            navigate('/');
          }}
          className="p-3.5 rounded-full focus-ring transition-colors bg-danger hover:bg-danger/90 text-white ml-2"
          title="Leave call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </footer>
      
    </div>
  );
}
