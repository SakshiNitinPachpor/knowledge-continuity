import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { InvitationVerify } from '../types';
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Building2, FolderKanban } from 'lucide-react';

export const InviteAcceptPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<InvitationVerify | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided in the URL.');
      setLoading(false);
      return;
    }

    api.verifyInvitation(token)
      .then((data) => {
        setInvite(data);
        setError(null);
      })
      .catch((err: any) => {
        setError(err.message || 'Invitation is invalid, expired, or revoked.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      const res = await api.acceptInvitation(token);
      setSuccess(`Successfully joined as ${res.role.replace('_', ' ')}!`);
      setTimeout(() => {
        if (res.project_id) {
          navigate(`/projects/${res.project_id}`);
        } else {
          navigate('/dashboard');
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#F8F6F1] dark:bg-[#111827] transition-colors">
      <div className="w-full max-w-lg bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-8 shadow-soft">
        
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] flex items-center justify-center mx-auto mb-3 shadow-soft">
            <ShieldCheck className="w-7 h-7 text-[#B9825A] dark:text-[#111827]" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#151923] dark:text-white">
            Workspace Invitation
          </h2>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
            Knowledge Continuity Access Control
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-[#B9825A] font-bold uppercase tracking-wider animate-pulse">
            Verifying invitation token...
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Invitation Error</span>
            </div>
            <p className="leading-relaxed">{error}</p>
            <div className="mt-4">
              <Link to="/login" className="text-[#B9825A] font-bold hover:underline">
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="p-5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-200 text-center">
            <CheckCircle2 className="w-8 h-8 text-teal-600 dark:text-teal-400 mx-auto mb-2" />
            <h3 className="text-base font-bold mb-1">{success}</h3>
            <p className="text-[11px] text-teal-700 dark:text-teal-300">
              Redirecting you to the project workspace...
            </p>
          </div>
        ) : invite ? (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900 border border-[#E5E1D8] dark:border-gray-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] dark:text-gray-400">Invited By:</span>
                <span className="font-bold text-[#151923] dark:text-white">{invite.invited_by_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] dark:text-gray-400">Workspace:</span>
                <span className="font-bold text-[#151923] dark:text-white flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#B9825A]" />
                  {invite.workspace_name}
                </span>
              </div>
              {invite.project_name && (
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B] dark:text-gray-400">Project:</span>
                  <span className="font-bold text-[#151923] dark:text-white flex items-center gap-1">
                    <FolderKanban className="w-3.5 h-3.5 text-[#B9825A]" />
                    {invite.project_name}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-[#E5E1D8] dark:border-gray-800">
                <span className="text-[#64748B] dark:text-gray-400">Assigned Role:</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-[#B9825A]/15 text-[#B9825A] dark:text-[#D4A373]">
                  {invite.role.replace('_', ' ')}
                </span>
              </div>
            </div>

            {user ? (
              <div className="space-y-3">
                <p className="text-xs text-[#64748B] dark:text-gray-400 text-center leading-relaxed">
                  You are currently logged in as <strong>{user.email}</strong>. Click below to accept the invitation and gain role-authorized access.
                </p>
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full py-3 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] font-bold text-xs hover:bg-black dark:hover:bg-[#a6724d] transition shadow-soft flex items-center justify-center gap-2 cursor-pointer"
                >
                  {accepting ? 'Joining Project...' : 'Accept Invitation & Enter Project'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-xs text-[#64748B] dark:text-gray-400 leading-relaxed">
                  To accept this invitation, please sign in or register your account:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to={`/login?redirect=/invite?token=${token}`}
                    className="py-2.5 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-[#151923] dark:text-white hover:border-[#B9825A] transition text-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    to={`/register?redirect=/invite?token=${token}`}
                    className="py-2.5 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition text-center"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : null}

      </div>
    </div>
  );
};
