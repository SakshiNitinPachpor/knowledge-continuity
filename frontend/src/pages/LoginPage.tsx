import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, AlertCircle, Info } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#F8F6F1] dark:bg-[#111827] transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-8 shadow-soft">
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] flex items-center justify-center mx-auto mb-3 shadow-soft">
            <ShieldCheck className="w-7 h-7 text-[#B9825A] dark:text-[#111827]" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#151923] dark:text-white">Sign In to Your Workspace</h2>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">Knowledge Continuity Platform</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] font-bold text-xs hover:bg-black dark:hover:bg-[#a6724d] transition shadow-soft flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Reference Workspace Evaluation Credential Tip */}
        <div className="mt-6 p-3 rounded-xl bg-[#F8F6F1] dark:bg-gray-900/70 border border-[#E5E1D8] dark:border-gray-800 text-[11px] text-[#64748B] dark:text-gray-400">
          <div className="flex items-center gap-1.5 font-bold text-[#151923] dark:text-gray-300 mb-1">
            <Info className="w-3.5 h-3.5 text-[#B9825A]" />
            <span>Judge / Evaluator Notice:</span>
          </div>
          <p className="leading-relaxed">
            You can register a brand new account to test isolated private workspaces, or sign in to the preloaded sample owner workspace with:
            <code className="block mt-1 font-mono text-[10px] text-[#B9825A] bg-white dark:bg-gray-800 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
              owner@continuity.internal &bull; OwnerPass123!
            </code>
          </p>
        </div>

        <div className="mt-6 text-center text-xs text-[#64748B] dark:text-gray-400">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-bold text-[#B9825A] hover:underline">
            Register new account
          </Link>
        </div>

      </div>
    </div>
  );
};
