import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Claim, EvidenceConflict, Project, ClaimStatus } from '../types';
import { ClaimCard } from '../components/ClaimCard';
import { ConflictModal } from '../components/ConflictModal';
import {
  CheckCircle2, AlertTriangle, Filter, Plus,
  ShieldCheck, HelpCircle, XCircle, Search
} from 'lucide-react';

export const ReviewCentrePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [conflicts, setConflicts] = useState<EvidenceConflict[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'claims' | 'conflicts'>('claims');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Conflict modal
  const [activeConflict, setActiveConflict] = useState<EvidenceConflict | null>(null);

  // Edit claim modal
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [editDate, setEditDate] = useState('');

  // Manual claim creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('decision');
  const [newOwner, setNewOwner] = useState('');
  const [newDate, setNewDate] = useState('');

  const loadData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [proj, cList, confList] = await Promise.all([
        api.getProject(projectId),
        api.listClaims(projectId),
        api.listConflicts(projectId),
      ]);
      setProject(proj);
      setClaims(cList);
      setConflicts(confList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleVerifyClaim = async (claimId: string, notes?: string) => {
    if (!projectId) return;
    await api.reviewClaim(projectId, claimId, 'verified', notes);
    await loadData();
  };

  const handleRejectClaim = async (claimId: string, notes?: string) => {
    if (!projectId) return;
    await api.reviewClaim(projectId, claimId, 'rejected', notes);
    await loadData();
  };

  const handleResolveConflict = async (conflictId: string, choice: string, notes: string) => {
    if (!projectId) return;
    await api.resolveConflict(projectId, conflictId, choice, notes);
    await loadData();
  };

  const handleEditClaim = (claim: Claim) => {
    setEditingClaim(claim);
    setEditTitle(claim.title);
    setEditContent(claim.content);
    setEditOwner(claim.entity_owner || '');
    setEditDate(claim.date_reference || '');
  };

  const handleSaveClaimEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !editingClaim) return;
    await api.updateClaim(projectId, editingClaim.id, {
      title: editTitle,
      content: editContent,
      entity_owner: editOwner || undefined,
      date_reference: editDate || undefined,
    });
    setEditingClaim(null);
    await loadData();
  };

  const handleCreateManualClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !newTitle || !newContent) return;
    await api.createClaim(projectId, {
      title: newTitle,
      content: newContent,
      claim_type: newType as any,
      entity_owner: newOwner || undefined,
      date_reference: newDate || undefined,
    });
    setShowCreateModal(false);
    setNewTitle('');
    setNewContent('');
    setNewOwner('');
    setNewDate('');
    await loadData();
  };

  // Filtered claims
  const filteredClaims = claims.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (typeFilter !== 'all' && c.claim_type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = c.title.toLowerCase().includes(q) ||
        c.content.toLowerCase().includes(q) ||
        (c.entity_owner && c.entity_owner.toLowerCase().includes(q)) ||
        (c.document_name && c.document_name.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const openConflictsCount = conflicts.filter(c => c.status === 'open').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Title Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-[#B9825A] block mb-1">
            Feature 4 — Evidence & Trust Engine
          </span>
          <h1 className="text-2xl font-extrabold text-[#151923] dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-teal-600" />
            Evidence Review Centre
          </h1>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
            Human reviewers inspect candidate claims, verify source passages, resolve contradictory statements, and approve verified facts.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition shadow-soft flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Manual Claim</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E1D8] dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'claims'
              ? 'bg-[#151923] text-white dark:bg-[#B9825A] dark:text-[#111827]'
              : 'text-[#64748B] hover:text-[#151923] dark:text-gray-400'
          }`}
        >
          Extracted Claims ({claims.length})
        </button>

        <button
          onClick={() => setActiveTab('conflicts')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'conflicts'
              ? 'bg-rose-600 text-white'
              : 'text-[#64748B] hover:text-[#151923] dark:text-gray-400'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Contradictory Conflicts</span>
          {openConflictsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 text-[10px] font-extrabold">
              {openConflictsCount}
            </span>
          )}
        </button>
      </div>

      {/* Claims Tab Content */}
      {activeTab === 'claims' && (
        <div className="space-y-6">
          
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-[#1B2432] rounded-2xl border border-[#E5E1D8] dark:border-gray-800">
            
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search claims by keyword, owner, or document..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] font-semibold text-gray-500">Status:</span>
              {['all', 'needs_review', 'verified', 'conflicting_evidence', 'missing_evidence', 'rejected'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg capitalize transition ${
                    statusFilter === st
                      ? 'bg-[#151923] text-white dark:bg-[#B9825A] dark:text-[#111827]'
                      : 'bg-[#F2EFE9] dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

          </div>

          {/* Claims Grid */}
          {filteredClaims.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClaims.map((claim) => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  userRole={project?.user_role}
                  onVerify={handleVerifyClaim}
                  onReject={handleRejectClaim}
                  onEdit={handleEditClaim}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 text-xs text-gray-400">
              No claims match the selected filter criteria.
            </div>
          )}

        </div>
      )}

      {/* Conflicts Tab Content */}
      {activeTab === 'conflicts' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-gray-800/80 border border-amber-200 dark:border-gray-700 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <strong>Evidence & Trust Rule:</strong> When multiple documents assert contradictory dates, owners, or decisions, Knowledge Continuity strictly surfaces both source passages without guessing. A human reviewer must choose the authoritative source or provide an explicit resolution note.
          </div>

          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="p-6 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                    conflict.status === 'resolved'
                      ? 'bg-teal-100 text-teal-800'
                      : 'bg-rose-100 text-rose-800 animate-pulse'
                  }`}>
                    {conflict.status}
                  </span>
                  <h3 className="font-bold text-sm text-[#151923] dark:text-white">
                    {conflict.topic}
                  </h3>
                </div>

                {conflict.status === 'open' && (
                  <button
                    onClick={() => setActiveConflict(conflict)}
                    className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition shadow-xs"
                  >
                    Resolve Contradiction
                  </button>
                )}
              </div>

              <p className="text-xs text-[#64748B] dark:text-gray-300 leading-relaxed mb-4">
                {conflict.description}
              </p>

              {/* Resolution details if resolved */}
              {conflict.status === 'resolved' && (
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 text-xs text-teal-900 dark:text-teal-200">
                  <span className="font-bold block mb-0.5">Authoritative Resolution ({conflict.resolution_choice}):</span>
                  {conflict.resolution_notes}
                </div>
              )}
            </div>
          ))}

          {conflicts.length === 0 && (
            <div className="p-12 text-center bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 text-xs text-teal-600 font-bold">
              ✓ No contradictory statements detected between ingested documents.
            </div>
          )}
        </div>
      )}

      {/* Conflict Resolution Modal */}
      {activeConflict && (
        <ConflictModal
          conflict={activeConflict}
          onClose={() => setActiveConflict(null)}
          onResolve={handleResolveConflict}
        />
      )}

      {/* Edit Claim Modal */}
      {editingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-6 md:p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#151923] dark:text-white mb-4">
              Edit Reconstructed Claim
            </h3>
            <form onSubmit={handleSaveClaimEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-[#151923] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Claim Statement</label>
                <textarea
                  rows={3}
                  required
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-[#151923] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Owner / Assignee</label>
                  <input
                    type="text"
                    value={editOwner}
                    onChange={(e) => setEditOwner(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-[#151923] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Date Reference</label>
                  <input
                    type="text"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    placeholder="e.g. 2026-10-15"
                    className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-[#151923] dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClaim(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] hover:bg-black"
                >
                  Save Corrections
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Manual Claim Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-6 md:p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#151923] dark:text-white mb-4">
              Add Manual Knowledge Claim
            </h3>
            <form onSubmit={handleCreateManualClaim} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-[#151923] dark:text-white"
                >
                  <option value="decision">Decision</option>
                  <option value="completed_task">Completed Task</option>
                  <option value="unfinished_task">Unfinished Task</option>
                  <option value="responsibility">Responsibility</option>
                  <option value="dependency">Dependency</option>
                  <option value="risk">Risk Flag</option>
                  <option value="milestone">Milestone</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Architecture Decision: Redis Cache Layer"
                  className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-[#151923] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Content / Context</label>
                <textarea
                  rows={3}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Detail the deliverable, rationale, or operational requirement..."
                  className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-[#151923] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Owner</label>
                  <input
                    type="text"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-[#151923] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input
                    type="text"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    placeholder="e.g. 2026-10-15"
                    className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-[#151923] dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] hover:bg-black"
                >
                  Create Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
