import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Handover, HandoverChecklistItem, Project, Claim, ClaimType,
  ProjectResponsibility, HardwareAsset
} from '../types';
import {
  Award, CheckCircle2, Clock, AlertTriangle,
  Download, FileText, Check, Lock, Sparkles, UserCheck,
  Send, MessageSquare, AlertCircle, PlusCircle, CheckSquare,
  FileCheck2, Globe, History, ArrowRight, User, ShieldCheck,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const HandoverPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [handover, setHandover] = useState<Handover | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [responsibilities, setResponsibilities] = useState<ProjectResponsibility[]>([]);
  const [hardwareAssets, setHardwareAssets] = useState<HardwareAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'status_overview' | 'checklist' | 'ai_checks' | 'preparation' | 'published_view' | 'history'>('status_overview');

  // Creator Verification actions
  const [approving, setApproving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');
  const [showChangesModal, setShowChangesModal] = useState(false);

  // Outgoing member actions
  const [submitting, setSubmitting] = useState(false);
  const [showAddClaimModal, setShowAddClaimModal] = useState(false);
  const [claimTitle, setClaimTitle] = useState('');
  const [claimContent, setClaimContent] = useState('');
  const [claimType, setClaimType] = useState<ClaimType>('decision');
  const [claimOwner, setClaimOwner] = useState('');
  const [addingClaim, setAddingClaim] = useState(false);

  // Successor actions
  const [receiving, setReceiving] = useState(false);
  const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false);
  const [ackNotes, setAckNotes] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [proj, h, cList, rList, hwList] = await Promise.all([
        api.getProject(projectId),
        api.getHandover(projectId),
        api.listClaims(projectId, 'verified').catch(() => []),
        api.listResponsibilities(projectId).catch(() => []),
        api.listHardwareAssets(projectId).catch(() => [])
      ]);
      setProject(proj);
      setHandover(h);
      setClaims(cList);
      setResponsibilities(rList);
      setHardwareAssets(hwList);

      if (h.status === 'published' || h.status === 'received' || proj.user_role === 'successor') {
        setActiveTab('published_view');
      } else if (proj.user_role === 'outgoing_member') {
        setActiveTab('preparation');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to load handover package.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleStatusChange = async (item: HandoverChecklistItem, nextStatus: string) => {
    if (!projectId) return;
    try {
      await api.updateChecklistItem(projectId, item.id, nextStatus, item.details);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update checklist item.');
    }
  };

  const handleSubmitForReview = async () => {
    if (!projectId) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const updated = await api.submitHandover(projectId);
      setHandover(updated);
      setActionMessage('Handover package submitted for Project Creator verification.');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit handover.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !changeNotes.trim()) return;
    setRequestingChanges(true);
    setErrorMessage(null);
    try {
      const updated = await api.requestHandoverChanges(projectId, changeNotes.trim());
      setHandover(updated);
      setShowChangesModal(false);
      setChangeNotes('');
      setActionMessage('Revision request dispatched to outgoing team lead.');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to request changes.');
    } finally {
      setRequestingChanges(false);
    }
  };

  const handleApproveHandover = async () => {
    if (!projectId) return;
    setApproving(true);
    setErrorMessage(null);
    try {
      const approved = await api.approveHandover(projectId);
      setHandover(approved);
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
      setActionMessage('Handover formally approved! The package is now eligible for official publication.');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Cannot approve handover.');
    } finally {
      setApproving(false);
    }
  };

  const handlePublishHandover = async () => {
    if (!projectId) return;
    setPublishing(true);
    setErrorMessage(null);
    try {
      const pub = await api.publishHandover(projectId);
      setHandover(pub);
      setActiveTab('published_view');
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      setActionMessage('Handover package officially released and published to the successor!');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Cannot publish handover.');
    } finally {
      setPublishing(false);
    }
  };

  const handleReceiveHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setReceiving(true);
    setErrorMessage(null);
    try {
      const updated = await api.receiveHandover(projectId, ackNotes.trim());
      setHandover(updated);
      setShowAcknowledgeModal(false);
      setAckNotes('');
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.7 } });
      setActionMessage('Successor receipt formally acknowledged and recorded in the audit trail.');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to acknowledge handover.');
    } finally {
      setReceiving(false);
    }
  };

  const handleAddClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !claimTitle.trim() || !claimContent.trim()) return;
    setAddingClaim(true);
    setErrorMessage(null);
    try {
      await api.createClaim(projectId, {
        title: claimTitle.trim(),
        content: claimContent.trim(),
        claim_type: claimType,
        entity_owner: claimOwner.trim() || undefined,
        status: 'needs_review'
      });
      setShowAddClaimModal(false);
      setClaimTitle('');
      setClaimContent('');
      setClaimOwner('');
      setActionMessage('New knowledge claim added to project repository.');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add claim.');
    } finally {
      setAddingClaim(false);
    }
  };

  // Rule: Project Creator = Project Owner = Final Handover Approver
  const isProjectCreator = project?.created_by_id === user?.id || user?.is_superuser;
  const isOutgoing = project?.user_role === 'outgoing_member' || isProjectCreator || project?.user_role === 'contributor';
  const isSuccessor = project?.user_role === 'successor';

  // Parse version history safely
  let versionHistory: any[] = [];
  if (handover?.history_json) {
    try {
      versionHistory = JSON.parse(handover.history_json);
    } catch {
      versionHistory = [];
    }
  }

  if (loading && !handover) {
    return (
      <div className="p-12 text-center text-xs text-[#B9825A] font-bold uppercase tracking-widest animate-pulse">
        Loading Handover Dossier...
      </div>
    );
  }

  if (!handover) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <Lock className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-[#151923] dark:text-white">Handover Package Restricted</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          The official handover package is currently being prepared and verified. As an incoming successor, you will gain access once the Project Creator approves and publishes the package.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-[#B9825A] block mb-1">
            Feature 07 — Handover Completion Tracker
          </span>
          <h1 className="text-2xl font-extrabold text-[#151923] dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-[#B9825A]" />
            Project Handover Verification & Publishing
          </h1>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
            Grounded dual-sided workflow: Outgoing Lead Submits → Project Creator Verifies → Official Publication → Successor Receipt.
          </p>
        </div>

        {/* Dynamic Action Buttons Based on Role & State */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Outgoing Member Submit */}
          {isOutgoing && (handover.status === 'draft' || handover.status === 'changes_requested') && (
            <button
              onClick={handleSubmitForReview}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition shadow-soft flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Submit for Creator Verification'}</span>
            </button>
          )}

          {/* Project Creator Actions (Step 4) */}
          {isProjectCreator && (handover.status === 'submitted' || handover.status === 'draft') && (
            <>
              <button
                onClick={() => setShowChangesModal(true)}
                className="px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Request Changes</span>
              </button>

              <button
                onClick={handleApproveHandover}
                disabled={approving || handover.completion_percentage < 75}
                className="px-4 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition shadow-soft flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title={handover.completion_percentage < 75 ? 'Requires at least 75% completion to approve' : ''}
              >
                <UserCheck className="w-4 h-4" />
                <span>{approving ? 'Verifying...' : 'Approve Handover'}</span>
              </button>
            </>
          )}

          {/* Publishing Action (Step 5 - Release to Successor) */}
          {isProjectCreator && handover.status === 'approved' && (
            <button
              onClick={handlePublishHandover}
              disabled={publishing}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition shadow-soft flex items-center gap-1.5 cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>{publishing ? 'Releasing...' : 'Publish Handover to Successor'}</span>
            </button>
          )}

          {/* Successor Acknowledge */}
          {isSuccessor && handover.status === 'published' && (
            <button
              onClick={() => setShowAcknowledgeModal(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition shadow-soft flex items-center gap-1.5 cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Acknowledge & Confirm Receipt</span>
            </button>
          )}

          {/* Export PDF Button (Approved, Published, or Received) */}
          {(handover.status === 'approved' || handover.status === 'published' || handover.status === 'received') && (
            <a
              href={api.getExportPdfUrl(projectId!)}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#1B2432] text-[#151923] dark:text-white border border-[#E5E1D8] dark:border-gray-800 text-xs font-bold hover:border-[#B9825A] transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#B9825A]" />
              <span>Download Approved PDF</span>
            </a>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-200 flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-teal-600 font-bold ml-2">Dismiss</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 font-bold ml-2">Dismiss</button>
        </div>
      )}

      {/* Reviewer Feedback Banner if Changes Requested */}
      {handover.status === 'changes_requested' && handover.change_request_notes && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Changes Requested by Project Creator:</span>
          </div>
          <p className="leading-relaxed pl-5 font-mono text-[11px]">{handover.change_request_notes}</p>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 7: EXPLICIT & UNAMBIGUOUS STATUS MESSAGES GRID    */}
      {/* ======================================================== */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E5E1D8] dark:border-gray-800 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-[#B9825A]">
              Lifecycle Tracking — No Role Confusion
            </span>
            <h3 className="text-sm font-bold text-[#151923] dark:text-white">
              Official Handover Workflow Status
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              Version {handover.version}.0
            </span>
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 font-mono">
              {handover.completion_percentage}% Readiness
            </span>
          </div>
        </div>

        {/* 8 Discrete Status Fields */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          
          <div className="p-3 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800">
            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Submitted By</span>
            <strong className="text-[#151923] dark:text-white block font-medium">
              {handover.outgoing_member_name || 'Pending Submission'}
            </strong>
          </div>

          <div className="p-3 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800">
            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Submitted On</span>
            <strong className="text-[#151923] dark:text-white block font-medium">
              {handover.submitted_at ? new Date(handover.submitted_at).toLocaleDateString() : '—'}
            </strong>
          </div>

          <div className="p-3 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800">
            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Awaiting Verification By</span>
            <strong className="text-amber-700 dark:text-amber-300 block font-medium">
              {handover.project_creator_name || 'Project Creator'}
            </strong>
          </div>

          <div className="p-3 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800">
            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Verification Status</span>
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
              handover.verification_status === 'Approved'
                ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                : handover.verification_status === 'Pending'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                : handover.verification_status === 'Changes Requested'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
            }`}>
              {handover.verification_status}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800">
            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Published By</span>
            <strong className="text-[#151923] dark:text-white block font-medium">
              {handover.published_by_name || 'Not yet published'}
            </strong>
          </div>

          <div className="p-3 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800">
            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Publication Status</span>
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
              handover.publication_status === 'Published'
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {handover.publication_status}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800">
            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Received By</span>
            <strong className="text-[#151923] dark:text-white block font-medium">
              {handover.received_by_name || 'Successor unassigned'}
            </strong>
          </div>

          <div className="p-3 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800">
            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Acknowledgement</span>
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
              handover.acknowledgement_status === 'Received'
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
            }`}>
              {handover.acknowledgement_status}
            </span>
          </div>

        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#F2EFE9] dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-teal-600 h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${handover.completion_percentage}%` }}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E1D8] dark:border-gray-800 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('checklist')}
          className={`px-3.5 py-2 font-bold rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'checklist'
              ? 'bg-[#151923] text-white dark:bg-[#B9825A] dark:text-[#111827]'
              : 'text-[#64748B] hover:text-[#151923] dark:text-gray-400'
          }`}
        >
          Checklist Domains ({handover.checklist_items.length})
        </button>

        <button
          onClick={() => setActiveTab('ai_checks')}
          className={`px-3.5 py-2 font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'ai_checks'
              ? 'bg-[#151923] text-white dark:bg-[#B9825A] dark:text-[#111827]'
              : 'text-[#64748B] hover:text-[#151923] dark:text-gray-400'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>AI Verification Checks ({handover.ai_findings?.length ?? 0})</span>
        </button>

        {isOutgoing && (
          <button
            onClick={() => setActiveTab('preparation')}
            className={`px-3.5 py-2 font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'preparation'
                ? 'bg-[#151923] text-white dark:bg-[#B9825A] dark:text-[#111827]'
                : 'text-[#64748B] hover:text-[#151923] dark:text-gray-400'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Preparation Studio</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('published_view')}
          className={`px-3.5 py-2 font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'published_view'
              ? 'bg-[#151923] text-white dark:bg-[#B9825A] dark:text-[#111827]'
              : 'text-[#64748B] hover:text-[#151923] dark:text-gray-400'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Successor Dossier View</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-2 font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'history'
              ? 'bg-[#151923] text-white dark:bg-[#B9825A] dark:text-[#111827]'
              : 'text-[#64748B] hover:text-[#151923] dark:text-gray-400'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Version History ({versionHistory.length})</span>
        </button>
      </div>

      {/* Tab 1: Checklist */}
      {activeTab === 'checklist' && (
        <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 shadow-soft divide-y divide-[#E5E1D8] dark:divide-gray-800">
          {handover.checklist_items.map((item) => (
            <div
              key={item.id}
              className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold text-[#B9825A]">
                    {item.category}
                  </span>
                  {item.is_mandatory && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600">
                      Mandatory
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-xs text-[#151923] dark:text-white">
                  {item.item_name}
                </h3>
              </div>

              {/* Status Controls */}
              {isProjectCreator ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['complete', 'needs_review', 'incomplete', 'blocked'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(item, st)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg capitalize transition cursor-pointer ${
                        item.status === st
                          ? st === 'complete'
                            ? 'bg-teal-600 text-white'
                            : st === 'needs_review'
                            ? 'bg-amber-500 text-white'
                            : st === 'blocked'
                            ? 'bg-rose-600 text-white'
                            : 'bg-gray-800 text-white'
                          : 'bg-[#F2EFE9] dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              ) : (
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                  item.status === 'complete'
                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                }`}>
                  {item.status.replace('_', ' ')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: AI Verification Checks */}
      {activeTab === 'ai_checks' && (
        <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8] dark:border-gray-800">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-amber-600 dark:text-amber-400 block mb-0.5">
                AI Handover Quality Verification
              </span>
              <h3 className="text-base font-bold text-[#151923] dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                AI-Assisted Completeness & Grounding Checks
              </h3>
            </div>
            <span className="text-xs text-[#64748B] dark:text-gray-400">
              AI provides findings; only Project Creator can approve.
            </span>
          </div>

          <div className="space-y-3">
            {handover.ai_findings && handover.ai_findings.length > 0 ? (
              handover.ai_findings.map((f, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-2xl border flex items-start gap-3 ${
                    f.severity === 'critical'
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                      : f.severity === 'warning'
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
                      : 'bg-teal-50/60 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {f.severity === 'critical' ? (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    ) : f.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-gray-500">{f.category}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        f.severity === 'critical' ? 'bg-rose-100 text-rose-800' :
                        f.severity === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                      }`}>
                        {f.severity}
                      </span>
                    </div>
                    <h5 className="font-bold text-xs text-[#151923] dark:text-white">{f.finding}</h5>
                    <p className="text-[11px] text-[#64748B] dark:text-gray-400 italic">Evidence: {f.evidence}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 italic">Running intelligence checks...</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Outgoing Member Preparation Studio */}
      {activeTab === 'preparation' && isOutgoing && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#151923] dark:text-white">
                  Outgoing Member Knowledge Input Studio
                </h3>
                <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                  Record unwritten technical context, pending tasks, key stakeholders, and operational blockers.
                </p>
              </div>
              <button
                onClick={() => setShowAddClaimModal(true)}
                className="px-4 py-2 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Handover Item</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800">
                <span className="font-bold text-[#151923] dark:text-white block mb-1">1. Record Decisions</span>
                <p className="text-[#64748B] dark:text-gray-400 text-[11px]">Log architectural trade-offs, tech stack choices, and rationale.</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800">
                <span className="font-bold text-[#151923] dark:text-white block mb-1">2. Outstanding Deliverables</span>
                <p className="text-[#64748B] dark:text-gray-400 text-[11px]">List unfinished pull requests, test drills, and pending certifications.</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800">
                <span className="font-bold text-[#151923] dark:text-white block mb-1">3. Continuity Risks</span>
                <p className="text-[#64748B] dark:text-gray-400 text-[11px]">Identify single points of failure and unassigned microservice ownerships.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Successor Dossier View */}
      {activeTab === 'published_view' && (
        <div className="p-8 md:p-10 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft space-y-8">
          
          <div className="border-b border-[#E5E1D8] dark:border-gray-800 pb-6 flex items-start justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-[#B9825A] block mb-1">
                Official Knowledge Continuity Document
              </span>
              <h2 className="text-2xl font-extrabold text-[#151923] dark:text-white">
                Successor Handover Dossier: {project?.name}
              </h2>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
                Approved by {handover.approved_by_name || handover.project_creator_name || 'Project Creator'} | Grounded in {claims.length} verified evidence claims
              </p>
            </div>
          </div>

          {/* Section 0: Ownership Matrix */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#151923] dark:text-white mb-3">
              1. Component Ownership & Responsibility Handover Matrix
            </h3>
            <div className="space-y-2.5">
              {responsibilities.length > 0 ? (
                responsibilities.map(r => (
                  <div key={r.id} className="p-4 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#151923] dark:text-white">{r.area}</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 capitalize">{r.status.replace('_', ' ')}</span>
                      </div>
                      <p className="text-[11px] text-[#64748B] dark:text-gray-400 mt-0.5">
                        Assigned Lead: <strong>{r.assigned_to}</strong> • Evidence: {r.evidence_summary || 'Documented'}
                      </p>
                      {r.successor_notes && (
                        <p className="text-[11px] text-[#B9825A] mt-1 italic">
                          Successor Transfer Note: "{r.successor_notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">No responsibilities assigned to handover scope yet.</p>
              )}
            </div>
          </div>

          {/* Section 1: Decisions */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#151923] dark:text-white mb-3">
              2. Approved Architectural Decisions & Rationale
            </h3>
            <div className="space-y-2.5">
              {claims.filter(c => c.claim_type === 'decision').length > 0 ? (
                claims.filter(c => c.claim_type === 'decision').map(d => (
                  <div key={d.id} className="p-4 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800">
                    <h4 className="font-bold text-xs text-[#151923] dark:text-white">{d.title}</h4>
                    <p className="text-xs text-[#64748B] dark:text-gray-300 mt-1 leading-relaxed">{d.content}</p>
                    <div className="mt-2 text-[10px] text-gray-500 font-medium">Source: {d.document_name || 'Verified Project Specification'}</div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">No verified architectural decisions on record yet.</p>
              )}
            </div>
          </div>

          {/* Section 2: Hardware Assets */}
          {hardwareAssets.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#151923] dark:text-white mb-3">
                3. Hardware Systems & Circuit Assets
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hardwareAssets.map(hw => (
                  <div key={hw.id} className="p-4 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800">
                    <span className="text-[10px] uppercase font-bold text-[#B9825A] block mb-1">{hw.category.replace('_', ' ')}</span>
                    <h4 className="font-bold text-xs text-[#151923] dark:text-white">{hw.title}</h4>
                    <p className="text-[11px] text-[#64748B] dark:text-gray-400 mt-1">{hw.notes || 'No notes provided.'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Tab 5: Version History */}
      {activeTab === 'history' && (
        <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-[#151923] dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-[#B9825A]" />
            Handover Dossier Version Trail & Lifecycle Events
          </h3>

          {versionHistory.length > 0 ? (
            <div className="divide-y divide-[#E5E1D8] dark:divide-gray-800">
              {versionHistory.map((item, idx) => (
                <div key={idx} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                        v{item.version}
                      </span>
                      <strong className="text-[#151923] dark:text-white capitalize">
                        {item.action?.replace('_', ' ')}
                      </strong>
                    </div>
                    {item.notes && (
                      <p className="text-gray-600 dark:text-gray-300 mt-1 font-mono text-[11px]">
                        "{item.notes}"
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      By: {item.requested_by || item.approved_by || item.published_by || item.received_by || 'User'}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 shrink-0">
                    {item.timestamp?.substring(0, 16).replace('T', ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No previous revision records in history log.</p>
          )}
        </div>
      )}

      {/* Modal: Request Changes (Project Creator) */}
      {showChangesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#151923] dark:text-white mb-1">Request Handover Corrections</h3>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mb-4">
              State the missing operational information required before Creator verification signoff.
            </p>

            <form onSubmit={handleRequestChanges} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">
                  Feedback & Missing Information
                </label>
                <textarea
                  rows={4}
                  required
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  placeholder="e.g. Please document the database rollback steps and confirm token rotation schedule..."
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangesModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748B] dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestingChanges}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition cursor-pointer"
                >
                  {requestingChanges ? 'Dispatching...' : 'Dispatch Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Acknowledge & Confirm Receipt (Successor) */}
      {showAcknowledgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#151923] dark:text-white mb-1">Acknowledge Handover Receipt</h3>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mb-4">
              Formally confirm receipt of the approved handover package. You can record any initial notes or report missing context.
            </p>

            <form onSubmit={handleReceiveHandover} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">
                  Successor Acknowledgment Notes (Optional)
                </label>
                <textarea
                  rows={4}
                  value={ackNotes}
                  onChange={(e) => setAckNotes(e.target.value)}
                  placeholder="e.g. Received all runbooks. Requested clarification on token rotation in Copilot."
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAcknowledgeModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748B] dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={receiving}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition cursor-pointer"
                >
                  {receiving ? 'Recording...' : 'Confirm Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Claim (Outgoing Member) */}
      {showAddClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#151923] dark:text-white mb-1">Add Handover Knowledge Claim</h3>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mb-4">
              Enter key context for incoming successors. Will be reviewed by project reviewers.
            </p>

            <form onSubmit={handleAddClaim} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Claim Type</label>
                <select
                  value={claimType}
                  onChange={(e) => setClaimType(e.target.value as ClaimType)}
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white"
                >
                  <option value="decision">Key Architectural Decision</option>
                  <option value="unfinished_task">Pending / In-Flight Deliverable</option>
                  <option value="dependency">Third-Party or Infrastructure Dependency</option>
                  <option value="risk">Continuity Risk / Vulnerability</option>
                  <option value="responsibility">Component Ownership / Responsibility</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={claimTitle}
                  onChange={(e) => setClaimTitle(e.target.value)}
                  placeholder="e.g. TimescaleDB Partitioning Scheme"
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Owner / Lead (Optional)</label>
                <input
                  type="text"
                  value={claimOwner}
                  onChange={(e) => setClaimOwner(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  required
                  value={claimContent}
                  onChange={(e) => setClaimContent(e.target.value)}
                  placeholder="Document specific details, reasoning, rollback procedure, or contacts..."
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClaimModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748B] dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingClaim}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] hover:bg-black transition cursor-pointer"
                >
                  {addingClaim ? 'Adding...' : 'Save Knowledge Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
