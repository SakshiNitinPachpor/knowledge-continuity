import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { ProjectMember, Project, UserRole, Invitation } from '../types';
import {
  Users, ShieldCheck, UserPlus, Link2, Copy, Check,
  Lock, AlertCircle, Trash2, XCircle, Clock, ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const MembersPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('successor');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [p, mList, iList] = await Promise.all([
        api.getProject(projectId),
        api.getProjectMembers(projectId),
        api.getProjectInvitations(projectId).catch(() => [])
      ]);
      setProject(p);
      setMembers(mList);
      setInvitations(iList);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load project members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !project || !inviteEmail.trim()) return;
    setSendingInvite(true);
    setError(null);
    try {
      const inv = await api.createInvitation({
        email: inviteEmail.trim(),
        role: inviteRole,
        workspace_id: project.workspace_id,
        project_id: projectId
      });
      setGeneratedInvite(inv);
      setInviteEmail('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate invitation.');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await api.revokeInvitation(invitationId);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke invitation.');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!projectId || !window.confirm('Are you sure you want to remove this member from the project?')) return;
    try {
      await api.removeProjectMember(projectId, memberId);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove member.');
    }
  };

  const isOwner = project?.user_role === 'project_owner' || project?.user_role === 'workspace_admin';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-[#B9825A] block mb-1">
            Project Collaboration & Membership
          </span>
          <h1 className="text-2xl font-extrabold text-[#151923] dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#B9825A]" />
            Team Members & Collaborators
          </h1>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
            Manage collaborators, generate secure 7-day invitation links, and coordinate knowledge handover roles.
          </p>
        </div>

        <button
          onClick={() => {
            setGeneratedInvite(null);
            setShowInviteModal(true);
          }}
          className="px-4 py-2.5 rounded-2xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black dark:hover:bg-[#a6724d] transition shadow-soft flex items-center gap-1.5 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Team Member</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Role Explanations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 text-xs shadow-soft">
          <span className="font-bold text-[#151923] dark:text-white block mb-1">Project Owner</span>
          <p className="text-[#64748B] dark:text-gray-400 leading-relaxed text-[11px]">
            Full administration, project settings, member invitations, and document ingestion.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 text-xs shadow-soft">
          <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">Outgoing Member</span>
          <p className="text-[#64748B] dark:text-gray-400 leading-relaxed text-[11px]">
            Prepares handovers, records decisions, logs deliverables, risks, and submits for review.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 text-xs shadow-soft">
          <span className="font-bold text-teal-600 dark:text-teal-400 block mb-1">Reviewer</span>
          <p className="text-[#64748B] dark:text-gray-400 leading-relaxed text-[11px]">
            Inspects evidence, resolves conflicts, verifies claims, requests corrections, approves handovers.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 text-xs shadow-soft">
          <span className="font-bold text-purple-600 dark:text-purple-400 block mb-1">Successor</span>
          <p className="text-[#64748B] dark:text-gray-400 leading-relaxed text-[11px]">
            Strictly restricted to approved handovers & verified claims. Unapproved drafts hidden.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 text-xs shadow-soft">
          <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">Contributor</span>
          <p className="text-[#64748B] dark:text-gray-400 leading-relaxed text-[11px]">
            General team member authorized to upload documents and suggest candidate claims.
          </p>
        </div>
      </div>

      {/* Active Members Table */}
      <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 shadow-soft overflow-hidden">
        <div className="p-5 border-b border-[#E5E1D8] dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#151923] dark:text-white">
            Active Project Members ({members.length})
          </h2>
          <span className="text-[11px] text-[#64748B] dark:text-gray-400">
            Backed by ProjectMember relational records
          </span>
        </div>

        <div className="divide-y divide-[#E5E1D8] dark:divide-gray-800">
          {members.map(m => (
            <div key={m.id} className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-[#B9825A]/15 text-[#B9825A] flex items-center justify-center font-bold text-xs">
                  {m.full_name ? m.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="font-bold text-xs text-[#151923] dark:text-white">{m.full_name}</h3>
                  <p className="text-[11px] text-[#64748B] dark:text-gray-400">{m.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  m.role === 'successor'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                    : m.role === 'reviewer'
                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                    : m.role === 'outgoing_member'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    : m.role === 'project_owner'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {m.role.replace('_', ' ')}
                </span>

                {isOwner && m.role !== 'project_owner' && (
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    title="Remove member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invitations Table */}
      {isOwner && (
        <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 shadow-soft overflow-hidden">
          <div className="p-5 border-b border-[#E5E1D8] dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#151923] dark:text-white">
                Member Invitations ({invitations.length})
              </h2>
              <p className="text-[11px] text-[#64748B] dark:text-gray-400 mt-0.5">
                Share the secure invitation link with your team member.
              </p>
            </div>
          </div>

          {invitations.length > 0 ? (
            <div className="divide-y divide-[#E5E1D8] dark:divide-gray-800">
              {invitations.map(inv => (
                <div key={inv.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[#151923] dark:text-white">{inv.email}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#F2EFE9] dark:bg-gray-800 text-[#151923] dark:text-gray-300 uppercase">
                        {inv.role.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        inv.status === 'accepted'
                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                          : inv.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] dark:text-gray-400 font-mono truncate max-w-md">
                      {inv.invite_url}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {inv.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleCopyLink(inv.invite_url)}
                          className="px-3 py-1.5 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-800 hover:border-[#B9825A] text-[#151923] dark:text-gray-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#B9825A]" />
                          <span>Copy Link</span>
                        </button>

                        <button
                          onClick={() => handleRevokeInvitation(inv.id)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Revoke</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#64748B] dark:text-gray-400">
              No pending invitations. Click "Invite Team Member" to invite collaborators.
            </div>
          )}
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#151923] dark:text-white mb-1">
              Invite Team Member
            </h3>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mb-4">
              Generates a secure tokenized invitation link with 7-day validity.
            </p>

            {generatedInvite ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-200 mb-1">
                    <Check className="w-4 h-4" />
                    <span>Invitation Generated Successfully</span>
                  </div>
                  <p className="text-teal-700 dark:text-teal-300 text-[11px] leading-relaxed">
                    Role assigned: <strong>{generatedInvite.role.replace('_', ' ')}</strong> for <strong>{generatedInvite.email}</strong>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">
                    Shareable Invitation Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedInvite.invite_url}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-[#151923] dark:text-white font-mono select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyLink(generatedInvite.invite_url)}
                      className="px-3.5 py-2.5 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-gray-400 mt-2 leading-relaxed">
                    Note: Email delivery is not configured locally. Share this link directly with the user so they can accept and join.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false);
                      setGeneratedInvite(null);
                    }}
                    className="px-5 py-2 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateInvitation} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">
                    Colleague Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. colleague@company.com"
                    className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">
                    Continuity Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                  >
                    <option value="successor">Incoming Successor (View Only Approved Handover & Copilot)</option>
                    <option value="outgoing_member">Outgoing Member (Prepare & Submit Handover)</option>
                    <option value="reviewer">Reviewer (Verify Claims, Resolve Conflicts & Approve)</option>
                    <option value="contributor">Contributor (Upload Documents & Propose Claims)</option>
                    <option value="project_owner">Project Owner (Full Administration)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-xs font-medium text-[#64748B] dark:text-gray-400 hover:text-black dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingInvite}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] hover:bg-black transition cursor-pointer"
                  >
                    {sendingInvite ? 'Generating...' : 'Generate Invite Link'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
