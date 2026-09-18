import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Video, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface p-8 rounded-xl border border-surfaceBorder shadow-2xl">
        <div className="flex justify-center mb-8">
          <div className="bg-accent/10 p-3 rounded-full">
            <Video className="w-8 h-8 text-accent" />
          </div>
        </div>
        
        <h1 className="text-2xl font-semibold text-center mb-2">Welcome back</h1>
        <p className="text-textSecondary text-center mb-8">Sign in to join or host a room.</p>
        
        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-md flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1.5" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn-primary w-full mt-2 flex justify-center py-2.5"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        
        <p className="mt-8 text-center text-sm text-textSecondary">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent hover:text-accentHover font-medium transition-colors focus-ring rounded-sm">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
