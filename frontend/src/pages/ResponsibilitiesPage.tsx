import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { ProjectResponsibility, HardwareAsset } from '../types';
import {
  Award, Cpu, CheckCircle2, AlertCircle, Plus,
  Edit2, Trash2, RefreshCw, UserCheck, ShieldCheck,
  FileText, ExternalLink, X, HelpCircle, Layers
} from 'lucide-react';

export const ResponsibilitiesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [responsibilities, setResponsibilities] = useState<ProjectResponsibility[]>([]);
  const [hardwareAssets, setHardwareAssets] = useState<HardwareAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'responsibilities' | 'hardware'>('responsibilities');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal: Add / Edit Responsibility
  const [showRespModal, setShowRespModal] = useState(false);
  const [editingResp, setEditingResp] = useState<ProjectResponsibility | null>(null);
  const [respArea, setRespArea] = useState('');
  const [respOwner, setRespOwner] = useState('');
  const [respEvidence, setRespEvidence] = useState('');
  const [respStatus, setRespStatus] = useState('confirmed');
  const [respNotes, setRespNotes] = useState('');

  // Modal: Add / Edit Hardware Asset
  const [showHwModal, setShowHwModal] = useState(false);
  const [editingHw, setEditingHw] = useState<HardwareAsset | null>(null);
  const [hwTitle, setHwTitle] = useState('');
  const [hwCategory, setHwCategory] = useState('circuit_diagram');
  const [hwNotes, setHwNotes] = useState('');
  const [hwComponents, setHwComponents] = useState('');

  const loadData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [resps, hw] = await Promise.all([
        api.listResponsibilities(projectId),
        api.listHardwareAssets(projectId)
      ]);
      setResponsibilities(resps);
      setHardwareAssets(hw);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load responsibilities data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Rescan evidence from documents
  const handleSyncFromEvidence = async () => {
    if (!projectId) return;
    setSyncing(true);
    setFeedback(null);
    setError(null);
    try {
      const res = await api.extractResponsibilities(projectId);
      setFeedback(res.message);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to sync responsibilities.');
    } finally {
      setSyncing(false);
    }
  };

  // Confirm responsibility assignment
  const handleConfirmAssignment = async (resp: ProjectResponsibility) => {
    if (!projectId) return;
    try {
      await api.updateResponsibility(projectId, resp.id, { status: 'confirmed' });
      setFeedback(`Confirmed ownership of '${resp.area}' by ${resp.assigned_to}.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm assignment.');
    }
  };

  // Delete responsibility
  const handleDeleteResp = async (id: string, area: string) => {
    if (!projectId) return;
    if (!confirm(`Delete responsibility assignment for '${area}'?`)) return;
    try {
      await api.deleteResponsibility(projectId, id);
      setFeedback(`Removed '${area}'.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete responsibility.');
    }
  };

  // Save responsibility form
  const handleSaveResp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !respArea || !respOwner) return;

    try {
      if (editingResp) {
        await api.updateResponsibility(projectId, editingResp.id, {
          area: respArea,
          assigned_to: respOwner,
          evidence_summary: respEvidence,
          status: respStatus,
          successor_notes: respNotes
        });
        setFeedback(`Updated responsibility '${respArea}'.`);
      } else {
        await api.createResponsibility(projectId, {
          area: respArea,
          assigned_to: respOwner,
          evidence_summary: respEvidence,
          status: respStatus,
          successor_notes: respNotes
        });
        setFeedback(`Created responsibility '${respArea}'.`);
      }
      setShowRespModal(false);
      setEditingResp(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save responsibility.');
    }
  };

  const openEditResp = (r: ProjectResponsibility) => {
    setEditingResp(r);
    setRespArea(r.area);
    setRespOwner(r.assigned_to);
    setRespEvidence(r.evidence_summary || '');
    setRespStatus(r.status);
    setRespNotes(r.successor_notes || '');
    setShowRespModal(true);
  };

  const openNewResp = () => {
    setEditingResp(null);
    setRespArea('');
    setRespOwner('');
    setRespEvidence('Manually assigned by project team.');
    setRespStatus('confirmed');
    setRespNotes('');
    setShowRespModal(true);
  };

  // Save hardware asset form
  const handleSaveHw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !hwTitle) return;

    try {
      if (editingHw) {
        await api.updateHardwareAsset(projectId, editingHw.id, {
          title: hwTitle,
          category: hwCategory,
          notes: hwNotes,
          components_json: hwComponents || '[]'
        });
        setFeedback(`Updated hardware asset '${hwTitle}'.`);
      } else {
        await api.createHardwareAsset(projectId, {
          title: hwTitle,
          category: hwCategory,
          notes: hwNotes,
          components_json: hwComponents || '[]',
          status: 'confirmed'
        });
        setFeedback(`Registered hardware asset '${hwTitle}'.`);
      }
      setShowHwModal(false);
      setEditingHw(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save hardware asset.');
    }
  };

  const openEditHw = (h: HardwareAsset) => {
    setEditingHw(h);
    setHwTitle(h.title);
    setHwCategory(h.category);
    setHwNotes(h.notes || '');
    setHwComponents(h.components_json || '[]');
    setShowHwModal(true);
  };

  const openNewHw = () => {
    setEditingHw(null);
    setHwTitle('');
    setHwCategory('circuit_diagram');
    setHwNotes('');
    setHwComponents('[]');
    setShowHwModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#151923] dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-[#B9825A]" />
            Responsibility & Hardware Ownership Matrix
          </h1>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
            Reconstruct who owns which project modules, verify supporting documentation evidence, and track hardware dependencies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSyncFromEvidence}
            disabled={syncing}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-[#1B2432] text-[#151923] dark:text-gray-200 border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#B9825A] ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Scanning Evidence...' : 'Rescan Evidence'}</span>
          </button>

          {activeTab === 'responsibilities' ? (
            <button
              onClick={openNewResp}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] hover:bg-black transition shadow-soft flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Responsibility</span>
            </button>
          ) : (
            <button
              onClick={openNewHw}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] hover:bg-black transition shadow-soft flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Hardware Asset</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 text-xs text-teal-800 dark:text-teal-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E1D8] dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('responsibilities')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'responsibilities'
              ? 'bg-[#151923] text-white dark:bg-[#B9825A] dark:text-[#111827]'
              : 'text-[#64748B] hover:text-black dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Module Ownership Matrix ({responsibilities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('hardware')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'hardware'
              ? 'bg-[#151923] text-white dark:bg-[#B9825A] dark:text-[#111827]'
              : 'text-[#64748B] hover:text-black dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Hardware Systems & Circuit Assets ({hardwareAssets.length})</span>
        </button>
      </div>

      {/* SECTION 1: RESPONSIBILITIES MATRIX */}
      {activeTab === 'responsibilities' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 shadow-soft overflow-hidden">
            <div className="p-5 border-b border-[#E5E1D8] dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#151923] dark:text-white">
                  Identified Project Responsibilities
                </h3>
                <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                  Extracted from uploaded architecture documents, code files, and meeting notes. All AI suggestions require human sign-off.
                </p>
              </div>
              <span className="text-xs font-bold text-[#B9825A] bg-[#B9825A]/10 px-2.5 py-1 rounded-lg">
                Human-in-the-Loop Verification
              </span>
            </div>

            {responsibilities.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F6F1] dark:bg-gray-900/60 text-[#64748B] dark:text-gray-400 uppercase font-bold text-[10px] tracking-wider border-b border-[#E5E1D8] dark:border-gray-800">
                    <tr>
                      <th className="py-3.5 px-5">Project Area / Module</th>
                      <th className="py-3.5 px-5">Current Responsible Lead</th>
                      <th className="py-3.5 px-5">Documented Evidence</th>
                      <th className="py-3.5 px-5">Verification Status</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E1D8] dark:divide-gray-800">
                    {responsibilities.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F8F6F1]/50 dark:hover:bg-gray-900/30 transition">
                        <td className="py-4 px-5 font-bold text-[#151923] dark:text-white">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-[#B9825A] shrink-0" />
                            <span>{r.area}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {r.assigned_to}
                          </span>
                        </td>
                        <td className="py-4 px-5 max-w-xs truncate text-[#64748B] dark:text-gray-400" title={r.evidence_summary}>
                          {r.evidence_summary || 'Documented in project records'}
                        </td>
                        <td className="py-4 px-5">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            r.status === 'confirmed'
                              ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                              : r.status === 'transferred'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}>
                            {r.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right space-x-2">
                          {r.status !== 'confirmed' && (
                            <button
                              onClick={() => handleConfirmAssignment(r)}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition font-bold text-[11px] cursor-pointer"
                              title="Confirm this assignment"
                            >
                              Confirm
                            </button>
                          )}
                          <button
                            onClick={() => openEditResp(r)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                            title="Edit or reassign"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteResp(r.id, r.area)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center text-xs text-gray-400">
                No responsibilities found. Click "Rescan Evidence" to extract module ownership from uploaded documents, or add one manually.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: HARDWARE SYSTEMS & CIRCUIT ASSETS */}
      {activeTab === 'hardware' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {hardwareAssets.map((hw) => {
              let componentsList: any[] = [];
              try {
                componentsList = JSON.parse(hw.components_json || '[]');
              } catch (e) {
                componentsList = [];
              }

              return (
                <div
                  key={hw.id}
                  className="p-5 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        hw.status === 'confirmed'
                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}>
                        {hw.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-[#151923] dark:text-white mb-1">
                      {hw.title}
                    </h3>
                    <p className="text-[11px] text-[#64748B] dark:text-gray-400 uppercase font-semibold mb-3">
                      Category: {hw.category.replace('_', ' ')}
                    </p>

                    {hw.notes && (
                      <p className="text-xs text-gray-700 dark:text-gray-300 mb-4 bg-[#F8F6F1] dark:bg-gray-900 p-2.5 rounded-xl border border-gray-200 dark:border-gray-800">
                        {hw.notes}
                      </p>
                    )}

                    {componentsList.length > 0 && (
                      <div className="space-y-1.5 mb-4">
                        <span className="text-[10px] uppercase font-bold text-gray-500 block">Identified Components:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {componentsList.map((c: any, i: number) => (
                            <span key={i} className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                              {c.name || c} ({c.type || 'Part'})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#E5E1D8] dark:border-gray-800 flex justify-end gap-2">
                    <button
                      onClick={() => openEditHw(hw)}
                      className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold hover:border-[#B9825A] transition cursor-pointer"
                    >
                      Annotate Components
                    </button>
                  </div>
                </div>
              );
            })}

            {hardwareAssets.length === 0 && (
              <div className="col-span-full p-12 text-center text-xs text-gray-400 bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800">
                No hardware assets registered yet. Upload circuit diagrams in Documents & Upload, or click "+ Add Hardware Asset".
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Responsibility */}
      {showRespModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-6 md:p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-bold text-[#151923] dark:text-white mb-1">
              {editingResp ? 'Edit Responsibility Assignment' : 'Assign Module Responsibility'}
            </h3>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mb-6">
              Track module ownership, supporting document evidence, and transfer notes.
            </p>

            <form onSubmit={handleSaveResp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Project Area / Module</label>
                <input
                  type="text"
                  required
                  value={respArea}
                  onChange={(e) => setRespArea(e.target.value)}
                  placeholder="e.g. Core Banking Payment Engine"
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Assigned Lead / Owner</label>
                  <input
                    type="text"
                    required
                    value={respOwner}
                    onChange={(e) => setRespOwner(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Verification Status</label>
                  <select
                    value={respStatus}
                    onChange={(e) => setRespStatus(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                  >
                    <option value="needs_confirmation">Needs Confirmation</option>
                    <option value="confirmed">Confirmed by Team</option>
                    <option value="transferred">Transferred to Successor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Supporting Evidence</label>
                <input
                  type="text"
                  value={respEvidence}
                  onChange={(e) => setRespEvidence(e.target.value)}
                  placeholder="e.g. Documented in Architecture Spec v2.4 (lines 20-45)"
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Successor Transfer Notes</label>
                <textarea
                  rows={2}
                  value={respNotes}
                  onChange={(e) => setRespNotes(e.target.value)}
                  placeholder="Key context or prerequisite walkthrough requirements..."
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRespModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] hover:bg-black transition cursor-pointer"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Hardware Asset */}
      {showHwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-6 md:p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-bold text-[#151923] dark:text-white mb-1">
              {editingHw ? 'Annotate Hardware Asset' : 'Register Hardware Asset'}
            </h3>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mb-6">
              Track circuit diagrams, PCB boards, and verify component identities.
            </p>

            <form onSubmit={handleSaveHw} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Asset Title</label>
                <input
                  type="text"
                  required
                  value={hwTitle}
                  onChange={(e) => setHwTitle(e.target.value)}
                  placeholder="e.g. ESP32 Sensor Interface Board"
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Category</label>
                <select
                  value={hwCategory}
                  onChange={(e) => setHwCategory(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                >
                  <option value="circuit_diagram">Circuit Diagram / Schematic</option>
                  <option value="pcb_layout">PCB Layout</option>
                  <option value="component_photo">Physical Component Photo</option>
                  <option value="system_architecture">System Hardware Architecture</option>
                  <option value="block_diagram">Block Diagram</option>
                  <option value="datasheet">Datasheet Reference</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">
                  Components (JSON Format)
                </label>
                <input
                  type="text"
                  value={hwComponents}
                  onChange={(e) => setHwComponents(e.target.value)}
                  placeholder='[{"name": "ESP32-WROOM-32D", "type": "MCU", "status": "confirmed"}]'
                  className="w-full text-xs p-3 font-mono rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Technical Notes</label>
                <textarea
                  rows={2}
                  value={hwNotes}
                  onChange={(e) => setHwNotes(e.target.value)}
                  placeholder="Operating voltages, pinouts, communication bus protocols..."
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowHwModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] hover:bg-black transition cursor-pointer"
                >
                  Save Hardware Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
