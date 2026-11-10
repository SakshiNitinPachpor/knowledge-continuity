import React, { useState } from 'react';
import { EvidenceConflict } from '../types';
import { AlertTriangle, Check, X, FileText, ArrowRight } from 'lucide-react';

interface ConflictModalProps {
  conflict: EvidenceConflict | null;
  onClose: () => void;
  onResolve: (conflictId: string, choice: string, notes: string) => Promise<void>;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({ conflict, onClose, onResolve }) => {
  const [selectedChoice, setSelectedChoice] = useState<'claim_a' | 'claim_b' | 'both_modified'>('claim_a');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  if (!conflict) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) return;
    setResolving(true);
    try {
      await onResolve(conflict.id, selectedChoice, resolutionNotes);
      onClose();
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E1D8] dark:border-gray-800 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#151923] dark:text-white">
                Human Resolution Required: Contradictory Evidence
              </h2>
              <p className="text-xs text-[#64748B] dark:text-gray-400">
                Topic: <strong>{conflict.topic}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-black dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contradiction Description */}
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
          {conflict.description}
        </div>

        {/* Side by side comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          
          {/* Claim A Card */}
          <div
            onClick={() => setSelectedChoice('claim_a')}
            className={`cursor-pointer p-5 rounded-2xl border transition-all ${
              selectedChoice === 'claim_a'
                ? 'border-[#B9825A] bg-amber-50/40 dark:bg-[#B9825A]/10 ring-2 ring-[#B9825A]/30'
                : 'border-[#E5E1D8] dark:border-gray-800 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 text-[#151923] dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                Source Document A
              </span>
              <input
                type="radio"
                name="resolution"
                checked={selectedChoice === 'claim_a'}
                onChange={() => setSelectedChoice('claim_a')}
                className="text-[#B9825A]"
              />
            </div>
            <h4 className="font-bold text-xs text-[#151923] dark:text-white mb-1.5">{conflict.claim_a.title}</h4>
            <p className="text-xs text-[#64748B] dark:text-gray-300 mb-3">{conflict.claim_a.content}</p>
            <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-[11px] font-serif italic text-gray-700 dark:text-gray-300">
              "{conflict.claim_a.passage_text || conflict.claim_a.content}"
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-[#64748B] dark:text-gray-400 font-medium">
              <FileText className="w-3.5 h-3.5 text-[#B9825A]" />
              <span>{conflict.claim_a.document_name || 'Document A'}</span>
              {conflict.claim_a.date_reference && <span className="text-blue-600 font-bold">[{conflict.claim_a.date_reference}]</span>}
            </div>
          </div>

          {/* Claim B Card */}
          <div
            onClick={() => setSelectedChoice('claim_b')}
            className={`cursor-pointer p-5 rounded-2xl border transition-all ${
              selectedChoice === 'claim_b'
                ? 'border-[#B9825A] bg-amber-50/40 dark:bg-[#B9825A]/10 ring-2 ring-[#B9825A]/30'
                : 'border-[#E5E1D8] dark:border-gray-800 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 text-[#151923] dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                Source Document B
              </span>
              <input
                type="radio"
                name="resolution"
                checked={selectedChoice === 'claim_b'}
                onChange={() => setSelectedChoice('claim_b')}
                className="text-[#B9825A]"
              />
            </div>
            <h4 className="font-bold text-xs text-[#151923] dark:text-white mb-1.5">{conflict.claim_b.title}</h4>
            <p className="text-xs text-[#64748B] dark:text-gray-300 mb-3">{conflict.claim_b.content}</p>
            <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-[11px] font-serif italic text-gray-700 dark:text-gray-300">
              "{conflict.claim_b.passage_text || conflict.claim_b.content}"
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-[#64748B] dark:text-gray-400 font-medium">
              <FileText className="w-3.5 h-3.5 text-[#B9825A]" />
              <span>{conflict.claim_b.document_name || 'Document B'}</span>
              {conflict.claim_b.date_reference && <span className="text-blue-600 font-bold">[{conflict.claim_b.date_reference}]</span>}
            </div>
          </div>

        </div>

        {/* Resolution Notes Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#151923] dark:text-white mb-1">
              Reviewer Decision Rationale (Will be permanently recorded in Handover Audit Log):
            </label>
            <textarea
              required
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Explain why this choice was confirmed (e.g. 'Confirmed with engineering lead that Oct 15 is the official cutover; Nov 20 was a tentative fallback')."
              className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-[#151923] dark:text-white focus:ring-2 focus:ring-[#B9825A]"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#64748B] dark:text-gray-400">
              Chosen Action: <strong className="text-[#151923] dark:text-white">{selectedChoice === 'claim_a' ? 'Verify Claim A & Reject Claim B' : 'Verify Claim B & Reject Claim A'}</strong>
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resolving || !resolutionNotes.trim()}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] hover:bg-black transition shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Resolve Conflict
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
