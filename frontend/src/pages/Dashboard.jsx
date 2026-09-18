import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Video, Keyboard, Plus, LogOut } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError('');
    try {
      const response = await api.post('/rooms');
      const { roomCode } = response.data;
      navigate(`/room/${roomCode}`);
    } catch (err) {
      setError('Failed to create a room. Please try again.');
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (joinCode.trim()) {
      navigate(`/room/${joinCode.trim()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8">
      <header className="flex justify-between items-center mb-16">
        <div className="flex items-center gap-2">
          <div className="bg-accent/10 p-2 rounded-md">
            <Video className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xl font-semibold tracking-tight">ConnectSphere</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-textSecondary text-sm hidden md:block">
            {user?.email}
          </span>
          <button 
            onClick={logout}
            className="text-textSecondary hover:text-textPrimary transition-colors p-2 rounded-md hover:bg-surface focus-ring flex items-center gap-2"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm md:hidden">Sign out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 max-w-5xl mx-auto w-full">
        <div className="flex-1 w-full space-y-8 max-w-md">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold mb-4 tracking-tight">
              Premium video meetings. <br/>
              <span className="text-textSecondary">Now free for everyone.</span>
            </h1>
            <p className="text-textSecondary text-lg">
              We engineered ConnectSphere to be a fast, secure, and easy-to-use mesh WebRTC platform.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-danger/10 border border-danger/20 rounded-md text-danger text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="btn-primary flex items-center justify-center gap-2 py-3"
            >
              <Plus className="w-5 h-5" />
              {isCreating ? 'Creating...' : 'New meeting'}
            </button>
            
            <form onSubmit={handleJoinRoom} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Keyboard className="h-5 w-5 text-textSecondary" />
                </div>
                <input
                  type="text"
                  placeholder="Enter a code or link"
                  className="input-field pl-10 py-3"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={!joinCode.trim()}
                className="btn-secondary whitespace-nowrap px-6"
              >
                Join
              </button>
            </form>
          </div>
        </div>
        
        <div className="flex-1 hidden md:flex justify-center">
          {/* A nice illustration or decorative element could go here */}
          <div className="w-full aspect-square max-w-md rounded-full bg-gradient-to-tr from-accent/20 to-surface border border-surfaceHighlight flex items-center justify-center shadow-2xl relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDIiLz4KPHBhdGggZD0iTTAgMEw4IDhaTTAgOEw4IDBaIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIwLjAyIi8+Cjwvc3ZnPg==')] opacity-50"></div>
             <Video className="w-32 h-32 text-accent/40 relative z-10" />
          </div>
        </div>
      </main>
    </div>
  );
}
