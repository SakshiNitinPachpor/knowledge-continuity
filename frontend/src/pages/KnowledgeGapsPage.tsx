import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { KnowledgeGap } from '../types';
import {
  HelpCircle, CheckCircle2, MessageSquare,
  ArrowRight, Check, X, AlertCircle
} from 'lucide-react';

export const KnowledgeGapsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolving gap modal
  const [activeGap, setActiveGap] = useState<KnowledgeGap | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadGaps = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await api.listGaps(projectId);
      setGaps(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGaps();
  }, [projectId]);

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !activeGap || !resolutionText.trim()) return;
    setSubmitting(true);
    try {
      await api.resolveGap(projectId, activeGap.id, resolutionText);
      setActiveGap(null);
      setResolutionText('');
      await loadGaps();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const openGaps = gaps.filter(g => g.status === 'open');
  const addressedGaps = gaps.filter(g => g.status === 'addressed');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div>
        <span className="text-xs uppercase font-bold tracking-wider text-[#B9825A] block mb-1">
          Feature 9 — Knowledge Gap Detector
        </span>
        <h1 className="text-2xl font-extrabold text-[#151923] dark:text-white flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-purple-600" />
          Knowledge Gap Detector & Context Inquiries
        </h1>
        <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
          Highlights tasks with no owner, decisions without documented rationale, and critical unmonitored dependencies.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-3xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50">
          <span className="text-[11px] font-bold uppercase text-purple-700 dark:text-purple-300">Open Gaps Requiring Context</span>
          <div className="text-3xl font-extrabold text-purple-800 dark:text-purple-200 font-mono mt-1">
            {openGaps.length}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50">
          <span className="text-[11px] font-bold uppercase text-teal-700 dark:text-teal-300">Addressed & Resolved Gaps</span>
          <div className="text-3xl font-extrabold text-teal-800 dark:text-teal-200 font-mono mt-1">
            {addressedGaps.length}
          </div>
        </div>
      </div>

      {/* Open Gaps List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-[#151923] dark:text-white flex items-center gap-2">
          <span>Unresolved Context Deficits ({openGaps.length})</span>
        </h2>

        {openGaps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openGaps.map(g => (
              <div
                key={g.id}
                className="p-6 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                      {g.gap_type.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-amber-600 font-bold">Open Deficit</span>
                  </div>

                  <h3 className="font-bold text-sm text-[#151923] dark:text-white mb-2">{g.title}</h3>
                  <p className="text-xs text-[#64748B] dark:text-gray-300 leading-relaxed mb-4">
                    {g.description}
                  </p>

                  {/* Recommended Question Prompt */}
                  <div className="mb-4 p-3 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[#B9825A] mb-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Recommended Resolving Question:</span>
                    </div>
                    <p className="text-xs font-serif italic text-gray-800 dark:text-gray-200">
                      "{g.recommended_question}"
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => { setActiveGap(g); setResolutionText(''); }}
                  className="w-full py-2.5 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Answer Question & Resolve Gap</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 text-xs text-teal-600 font-bold">
            ✓ All detected knowledge gaps have been addressed with supporting documentation.
          </div>
        )}
      </div>

      {/* Addressed Gaps Section */}
      {addressedGaps.length > 0 && (
        <div className="pt-6 border-t border-[#E5E1D8] dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
            Resolved Context Gaps ({addressedGaps.length})
          </h2>

          <div className="space-y-3">
            {addressedGaps.map(g => (
              <div
                key={g.id}
                className="p-5 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/40 border border-[#E5E1D8] dark:border-gray-800 opacity-90"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-xs text-[#151923] dark:text-white">{g.title}</h3>
                  <span className="text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-full">✓ Addressed</span>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-2">{g.description}</p>
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/50 text-xs text-teal-900 dark:text-teal-200">
                  <strong className="block text-[10px] uppercase font-bold mb-0.5">Documented Resolution:</strong>
                  {g.resolution}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {activeGap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-6 md:p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#151923] dark:text-white mb-2">
              Address Knowledge Gap
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">{activeGap.title}</p>

            <div className="mb-4 p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 text-xs text-purple-900 dark:text-purple-200">
              <strong className="block text-[10px] uppercase font-bold mb-0.5">Question Prompt:</strong>
              "{activeGap.recommended_question}"
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Supporting Resolution / Context Answer:
                </label>
                <textarea
                  rows={4}
                  required
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="Provide authoritative clarification (e.g. 'Assigned Alex Chen as secondary owner with weekly standup responsibility')..."
                  className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-[#151923] dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveGap(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] hover:bg-black"
                >
                  {submitting ? 'Saving...' : 'Resolve Gap'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
