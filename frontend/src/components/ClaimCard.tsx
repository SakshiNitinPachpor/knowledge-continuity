import React, { useState } from 'react';
import {
  CheckCircle, XCircle, AlertTriangle, HelpCircle,
  FileText, Calendar, User, Check, X, Edit3, ChevronDown, ChevronUp
} from 'lucide-react';
import { Claim, ClaimStatus, UserRole } from '../types';

interface ClaimCardProps {
  claim: Claim;
  userRole?: UserRole;
  onVerify?: (claimId: string, notes?: string) => Promise<void>;
  onReject?: (claimId: string, notes?: string) => Promise<void>;
  onEdit?: (claim: Claim) => void;
}

export const ClaimCard: React.FC<ClaimCardProps> = ({ claim, userRole, onVerify, onReject, onEdit }) => {
  const [showPassage, setShowPassage] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [showReviewInput, setShowReviewInput] = useState(false);

  const isReviewer = userRole === 'reviewer' || userRole === 'project_owner' || userRole === 'workspace_admin';

  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
            <CheckCircle className="w-3 h-3" /> Verified
          </span>
        );
      case 'conflicting_evidence':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 animate-pulse">
            <AlertTriangle className="w-3 h-3" /> Conflicting Evidence
          </span>
        );
      case 'missing_evidence':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
            <HelpCircle className="w-3 h-3" /> Missing Evidence
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <AlertTriangle className="w-3 h-3" /> Needs Review
          </span>
        );
    }
  };

  const handleAction = async (action: 'verify' | 'reject') => {
    setReviewing(true);
    try {
      if (action === 'verify' && onVerify) {
        await onVerify(claim.id, reviewNotes);
      } else if (action === 'reject' && onReject) {
        await onReject(claim.id, reviewNotes);
      }
      setShowReviewInput(false);
      setReviewNotes('');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1B2432] rounded-2xl border border-[#E5E1D8] dark:border-gray-800 p-5 shadow-soft hover:border-[#B9825A]/50 transition-all">
      
      {/* Header: Type, Status, Actions */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#F2EFE9] dark:bg-gray-800 text-[#64748B] dark:text-gray-300">
            {claim.claim_type.replace('_', ' ')}
          </span>
          {getStatusBadge(claim.status)}
        </div>

        {isReviewer && (
          <div className="flex items-center gap-1.5">
            {onEdit && (
              <button
                onClick={() => onEdit(claim)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white hover:bg-[#F2EFE9] dark:hover:bg-gray-800 transition"
                title="Edit claim details"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}

            {claim.status !== 'verified' && (
              <button
                onClick={() => {
                  setShowReviewInput(true);
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 transition flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Verify
              </button>
            )}

            {claim.status !== 'rejected' && (
              <button
                onClick={() => {
                  setShowReviewInput(true);
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Reject
              </button>
            )}
          </div>
        )}
      </div>

      {/* Claim Title & Content */}
      <h3 className="font-bold text-sm text-[#151923] dark:text-white mb-1.5">
        {claim.title}
      </h3>
      <p className="text-xs text-[#64748B] dark:text-gray-300 leading-relaxed mb-3">
        {claim.content}
      </p>

      {/* Owner & Date Metadata */}
      <div className="flex items-center gap-4 text-[11px] text-[#64748B] dark:text-gray-400 mb-3">
        {claim.entity_owner && (
          <span className="flex items-center gap-1 font-medium">
            <User className="w-3.5 h-3.5 text-[#B9825A]" /> Owner: <strong className="text-[#151923] dark:text-gray-200">{claim.entity_owner}</strong>
          </span>
        )}
        {claim.date_reference && (
          <span className="flex items-center gap-1 font-medium">
            <Calendar className="w-3.5 h-3.5 text-blue-500" /> Date: <strong className="text-[#151923] dark:text-gray-200">{claim.date_reference}</strong>
          </span>
        )}
      </div>

      {/* Reviewer Note if available */}
      {claim.reviewer_notes && (
        <div className="mb-3 p-2.5 rounded-xl bg-[#F8F6F1] dark:bg-gray-800/60 border border-[#E5E1D8] dark:border-gray-700 text-xs text-[#151923] dark:text-gray-300">
          <span className="font-bold text-[10px] uppercase text-[#64748B] dark:text-gray-400 block mb-0.5">Reviewer Note:</span>
          {claim.reviewer_notes}
        </div>
      )}

      {/* Inline Review Note Input Form */}
      {showReviewInput && (
        <div className="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-gray-800 border border-amber-200 dark:border-gray-700 space-y-2">
          <label className="block text-[11px] font-bold text-[#151923] dark:text-white">
            Add Reviewer Resolution Notes:
          </label>
          <input
            type="text"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="e.g., Verified against Q3 roadmap sign-off."
            className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-[#151923] dark:text-white"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowReviewInput(false)}
              className="px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-black"
            >
              Cancel
            </button>
            <button
              disabled={reviewing}
              onClick={() => handleAction('verify')}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700"
            >
              Confirm Verify
            </button>
            <button
              disabled={reviewing}
              onClick={() => handleAction('reject')}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700"
            >
              Confirm Reject
            </button>
          </div>
        </div>
      )}

      {/* Traceable Source Passage Expander */}
      <div className="border-t border-[#E5E1D8] dark:border-gray-800 pt-3">
        <button
          onClick={() => setShowPassage(!showPassage)}
          className="flex items-center justify-between w-full text-left text-xs font-medium text-[#64748B] hover:text-[#151923] dark:text-gray-400 dark:hover:text-white transition"
        >
          <span className="flex items-center gap-1.5 truncate">
            <FileText className="w-3.5 h-3.5 text-[#B9825A]" />
            Source: <strong className="text-[#151923] dark:text-gray-200">{claim.document_name || 'Project Document'}</strong>
            {claim.page_number && <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800">Page {claim.page_number}</span>}
          </span>
          {showPassage ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showPassage && (
          <div className="mt-2.5 p-3 rounded-xl bg-[#F8F6F1] dark:bg-gray-900/80 border border-[#E5E1D8] dark:border-gray-800 text-xs leading-relaxed text-[#151923] dark:text-gray-300 font-serif">
            <div className="text-[10px] font-mono text-[#64748B] dark:text-gray-500 mb-1">
              Section: {claim.section_heading || 'General'}
            </div>
            <blockquote className="border-l-2 border-[#B9825A] pl-3 italic text-gray-700 dark:text-gray-300">
              "{claim.passage_text || claim.content}"
            </blockquote>
          </div>
        )}
      </div>

    </div>
  );
};
