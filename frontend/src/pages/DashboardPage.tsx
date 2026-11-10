import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Project, Workspace } from '../types';
import {
  FolderKanban, Plus, FileText, CheckCircle2,
  ShieldAlert, HelpCircle, ArrowRight, Building2,
  Calendar, Layers, Clock, AlertCircle
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // New project form state
  const [selectedWsId, setSelectedWsId] = useState('');
  const [projName, setProjName] = useState('');
  const [projCode, setProjCode] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [wsList, projList] = await Promise.all([
        api.listWorkspaces(),
        api.listProjects()
      ]);
      setWorkspaces(wsList);
      setProjects(projList);
      if (wsList.length > 0 && !selectedWsId) {
        setSelectedWsId(wsList[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load workspace data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);



  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWsId || !projName || !projCode) return;
    setCreating(true);
    setError('');
    try {
      await api.createProject({
        workspace_id: selectedWsId,
        name: projName.trim(),
        code: projCode.trim().toUpperCase(),
        description: projDesc.trim(),
        target_handover_date: targetDate ? new Date(targetDate).toISOString() : undefined,
      });
      setShowCreateModal(false);
      setProjName('');
      setProjCode('');
      setProjDesc('');
      setTargetDate('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  };

  // Real Database Metrics
  const totalDocs = projects.reduce((acc, p) => acc + (p.document_count || 0), 0);
  const totalClaims = projects.reduce((acc, p) => acc + (p.claims_count || 0), 0);
  const totalVerified = projects.reduce((acc, p) => acc + (p.verified_claims_count || 0), 0);
  const pendingReview = Math.max(0, totalClaims - totalVerified);
  const totalRisks = projects.reduce((acc, p) => acc + (p.open_risks_count || 0), 0);
  const totalGaps = projects.reduce((acc, p) => acc + (p.open_gaps_count || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-[#B9825A] block mb-1">
            Enterprise Knowledge Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#151923] dark:text-white">
            Welcome, {user?.full_name}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-gray-400 mt-1">
            Manage your knowledge continuity projects, document ingestion, and successor handovers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] hover:bg-black dark:hover:bg-[#a6724d] transition shadow-soft flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Project</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row (Actual Database Facts) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-10">
        
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft">
          <div className="flex items-center justify-between text-[#64748B] dark:text-gray-400 mb-2">
            <span className="text-[11px] font-bold uppercase">Projects</span>
            <FolderKanban className="w-4 h-4 text-[#B9825A]" />
          </div>
          <div className="text-2xl font-extrabold text-[#151923] dark:text-white font-mono">
            {projects.length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft">
          <div className="flex items-center justify-between text-[#64748B] dark:text-gray-400 mb-2">
            <span className="text-[11px] font-bold uppercase">Documents</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-[#151923] dark:text-white font-mono">
            {totalDocs}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft">
          <div className="flex items-center justify-between text-[#64748B] dark:text-gray-400 mb-2">
            <span className="text-[11px] font-bold uppercase">Verified Claims</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 font-mono">
            {totalVerified}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft">
          <div className="flex items-center justify-between text-[#64748B] dark:text-gray-400 mb-2">
            <span className="text-[11px] font-bold uppercase">Needs Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
            {pendingReview}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft">
          <div className="flex items-center justify-between text-[#64748B] dark:text-gray-400 mb-2">
            <span className="text-[11px] font-bold uppercase">Active Risks</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
            {totalRisks}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft">
          <div className="flex items-center justify-between text-[#64748B] dark:text-gray-400 mb-2">
            <span className="text-[11px] font-bold uppercase">Knowledge Gaps</span>
            <HelpCircle className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-mono">
            {totalGaps}
          </div>
        </div>

      </div>

      {/* Projects List */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#151923] dark:text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#B9825A]" />
            Your Continuity Projects
          </h2>
          <span className="text-xs text-[#64748B] dark:text-gray-400 font-medium">
            {projects.length} project(s) accessible
          </span>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="group p-6 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] dark:hover:border-[#B9825A] shadow-soft hover:shadow-gold transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#F2EFE9] dark:bg-gray-800 text-[#151923] dark:text-gray-300 font-bold">
                        {project.code}
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                        project.status === 'handover_approved'
                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}>
                        {project.status.replace('_', ' ')}
                      </span>
                      {project.user_role && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 capitalize">
                          {project.user_role.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[#151923] dark:text-white group-hover:text-[#B9825A] transition">
                      {project.name}
                    </h3>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#B9825A] group-hover:translate-x-1 transition-all" />
                </div>

                <p className="text-xs text-[#64748B] dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                  {project.description || 'No description provided.'}
                </p>

                {/* Card Footer: Live Counters */}
                <div className="pt-4 border-t border-[#E5E1D8] dark:border-gray-800 grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <span className="block text-[#64748B] dark:text-gray-400 text-[10px] uppercase font-semibold">Docs</span>
                    <strong className="text-[#151923] dark:text-white font-mono">{project.document_count}</strong>
                  </div>
                  <div>
                    <span className="block text-[#64748B] dark:text-gray-400 text-[10px] uppercase font-semibold">Claims</span>
                    <strong className="text-[#151923] dark:text-white font-mono">{project.claims_count}</strong>
                  </div>
                  <div>
                    <span className="block text-[#64748B] dark:text-gray-400 text-[10px] uppercase font-semibold">Risks</span>
                    <strong className="text-rose-600 dark:text-rose-400 font-mono">{project.open_risks_count}</strong>
                  </div>
                  <div>
                    <span className="block text-[#64748B] dark:text-gray-400 text-[10px] uppercase font-semibold">Gaps</span>
                    <strong className="text-purple-600 dark:text-purple-400 font-mono">{project.open_gaps_count}</strong>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 shadow-soft">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#151923] dark:text-white">
              {workspaces.length === 0 ? 'No Workspaces Found' : 'No Projects in this Workspace Yet'}
            </h3>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1 max-w-md mx-auto mb-6 leading-relaxed">
              {workspaces.length === 0
                ? 'Create your first private workspace to begin structuring knowledge, uploading documents, and managing handovers.'
                : 'Create your first project to start uploading project specifications, tracking decisions, and preparing handovers.'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition cursor-pointer"
            >
              + Create First Project
            </button>
          </div>
        )}
      </div>

      {/* Modal: Create Project */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-6 md:p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-bold text-[#151923] dark:text-white mb-1">Create Knowledge Project</h3>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mb-6">
              Define project code, objectives, and target handover date.
            </p>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Target Workspace</label>
                <select
                  value={selectedWsId}
                  onChange={(e) => setSelectedWsId(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="e.g. Core Banking Payment Engine"
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Project Code</label>
                  <input
                    type="text"
                    required
                    value={projCode}
                    onChange={(e) => setProjCode(e.target.value)}
                    placeholder="e.g. PAY-01"
                    className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white uppercase font-mono focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Target Handover Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  placeholder="Summarize context, key departing lead, and transition objectives..."
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748B] dark:text-gray-400 hover:text-black dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] hover:bg-black transition cursor-pointer"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
