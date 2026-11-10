import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, fullName, title || 'Team Member', password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#F8F6F1] dark:bg-[#111827] transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-8 shadow-soft">
        
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] flex items-center justify-center mx-auto mb-3 shadow-soft">
            <ShieldCheck className="w-7 h-7 text-[#B9825A] dark:text-[#111827]" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#151923] dark:text-white">Create New Account</h2>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">Knowledge Continuity Platform</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Elena Rostova"
              className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Corporate Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. elena@company.com"
              className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Role / Job Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Staff Architect / Successor"
              className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Password</label>
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
            className="w-full py-3 mt-2 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] font-bold text-xs hover:bg-black dark:hover:bg-[#a6724d] transition shadow-soft flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Creating Account...' : 'Register Account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#64748B] dark:text-gray-400">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-[#B9825A] hover:underline">
            Sign In here
          </Link>
        </div>

      </div>
    </div>
  );
};
