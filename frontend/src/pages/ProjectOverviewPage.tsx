import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Project, DepartureExposureScore, Handover, EvidenceConflict } from '../types';
import { RiskGauge } from '../components/RiskGauge';
import {
  FileText, CheckCircle2, AlertTriangle, HelpCircle,
  Compass, Bot, Award, ArrowRight,
  ShieldCheck, Calendar, RefreshCw, ShieldAlert,
  GitCommit, Flag, Users, Cpu, FileCheck2, Lock,
  ChevronRight, Sparkles, UserCheck, FolderKanban, FileSpreadsheet
} from 'lucide-react';

export const ProjectOverviewPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [scoreData, setScoreData] = useState<DepartureExposureScore | null>(null);
  const [handover, setHandover] = useState<Handover | null>(null);
  const [conflicts, setConflicts] = useState<EvidenceConflict[]>([]);
  const [loading, setLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadAll = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [p, s, c] = await Promise.all([
        api.getProject(projectId),
        api.getDepartureScore(projectId),
        api.listConflicts(projectId),
      ]);
      setProject(p);
      setEditName(p.name);
      setEditDesc(p.description || '');
      setEditStatus(p.status);
      setScoreData(s);
      setConflicts(c.filter(item => item.status === 'open'));

      try {
        const h = await api.getHandover(projectId);
        setHandover(h);
      } catch {
        // Successor might not have access if unapproved
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setSavingEdit(true);
    try {
      await api.updateProject(projectId, {
        name: editName.trim(),
        description: editDesc.trim(),
        status: editStatus
      });
      setShowEditModal(false);
      await loadAll();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [projectId]);

  if (loading && !project) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
        <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
      </div>
    );
  }

  if (!project) {
    return <div className="p-8 text-center text-gray-500">Project not found or access denied.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Project Header Banner */}
      <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-6 md:p-8 shadow-soft">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-[#F2EFE9] dark:bg-gray-800 text-[#64748B] dark:text-gray-300">
                {project.code}
              </span>
              <span className={`text-xs uppercase font-bold px-2.5 py-0.5 rounded-lg ${
                project.status === 'handover_approved'
                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
              }`}>
                {project.status.replace('_', ' ')}
              </span>
              {project.user_role && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                  Your Role: {project.user_role.replace('_', ' ')}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#151923] dark:text-white">
              {project.name}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(project.user_role === 'project_owner' || project.user_role === 'workspace_admin') && (
              <button
                onClick={() => setShowEditModal(true)}
                className="px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-[#151923] dark:text-gray-200 hover:border-[#B9825A] transition shadow-xs cursor-pointer"
              >
                Edit Details
              </button>
            )}
            <Link
              to={`/projects/${project.id}/copilot`}
              className="px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition shadow-xs flex items-center gap-1.5"
            >
              <Bot className="w-4 h-4" />
              <span>Ask Copilot</span>
            </Link>
            <Link
              to={`/projects/${project.id}/handover`}
              className="px-4 py-2.5 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition shadow-xs flex items-center gap-1.5"
            >
              <Award className="w-4 h-4" />
              <span>Handover Package</span>
            </Link>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#64748B] dark:text-gray-300 leading-relaxed max-w-3xl mb-6">
          {project.description || 'No description provided.'}
        </p>

        {/* Handover Progress Pill */}
        {handover && (
          <div className="p-4 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] dark:text-gray-400 block mb-0.5">
                Official Handover Readiness
              </span>
              <p className="text-xs font-semibold text-[#151923] dark:text-white">
                {handover.completion_percentage}% of mandatory criteria verified · Status: {handover.status.replace('_', ' ').toUpperCase()}
              </p>
            </div>
            <div className="w-full sm:w-64 bg-[#E5E1D8] dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-teal-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${handover.completion_percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Critical Conflict Alert if Contradictory Evidence exists */}
      {conflicts.length > 0 && (
        <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-rose-900 dark:text-rose-200">
                {conflicts.length} Unresolved Contradictory Evidence Conflict(s) Detected
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 max-w-2xl leading-relaxed">
                Project documents contain conflicting operational dates or architectural choices. Human reviewer sign-off is required to protect handover integrity.
              </p>
            </div>
          </div>
          <Link
            to={`/projects/${project.id}/review`}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition shadow-xs shrink-0 flex items-center gap-1.5"
          >
            <span>Resolve Conflicts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Quick Access Section: Documents, Responsibilities, Lineage */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to={`/projects/${project.id}/documents`}
          className="p-4 rounded-2xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] shadow-soft transition group flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#151923] dark:text-white group-hover:text-[#B9825A] transition">
                Documents & Source Code
              </h4>
              <p className="text-[11px] text-[#64748B] dark:text-gray-400">
                {project.document_count || 0} ingested source files & repos
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to={`/projects/${project.id}/responsibilities`}
          className="p-4 rounded-2xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] shadow-soft transition group flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#151923] dark:text-white group-hover:text-[#B9825A] transition">
                Responsibility Matrix
              </h4>
              <p className="text-[11px] text-[#64748B] dark:text-gray-400">
                Component ownership & hardware
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to={`/projects/${project.id}/audit`}
          className="p-4 rounded-2xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] shadow-soft transition group flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#151923] dark:text-white group-hover:text-[#B9825A] transition">
                Audit Trail & Lineage
              </h4>
              <p className="text-[11px] text-[#64748B] dark:text-gray-400">
                Complete compliance history & actions
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* ======================================================== */}
      {/* CORE CONTINUITY ENGINES (Features 01 – 07)                */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B9825A]">
              Core Continuity Architecture
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-[#151923] dark:text-white">
              Specialized Verification & Handover Engines (01 – 07)
            </h3>
          </div>
          <span className="text-xs text-[#64748B] dark:text-gray-400 hidden sm:inline">
            Evidence-grounded operational modules
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Feature 01: AI Risk Radar */}
          <Link
            to={`/projects/${project.id}/risks`}
            className="p-5 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] shadow-soft transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  01
                </span>
              </div>
              <h4 className="font-bold text-sm text-[#151923] dark:text-white group-hover:text-[#B9825A] transition">
                01. AI Risk Radar
              </h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1 leading-relaxed">
                Operational risk radar tracking single points of failure, unassigned deliverables, and continuity vulnerabilities.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-[#E5E1D8] dark:border-gray-800 flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-semibold">
              <span>{project.open_risks_count} Active Risk(s)</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Feature 02: Evidence & Trust Engine */}
          <Link
            to={`/projects/${project.id}/review`}
            className="p-5 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] shadow-soft transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  02
                </span>
              </div>
              <h4 className="font-bold text-sm text-[#151923] dark:text-white group-hover:text-[#B9825A] transition">
                02. Evidence & Trust Engine
              </h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1 leading-relaxed">
                Grounded claim verification linking findings to exact document passages and resolving conflicting evidence.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-[#E5E1D8] dark:border-gray-800 flex items-center justify-between text-xs text-teal-600 dark:text-teal-400 font-semibold">
              <span>{project.verified_claims_count}/{project.claims_count} Verified</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Feature 03: Successor AI Copilot */}
          <Link
            to={`/projects/${project.id}/copilot`}
            className="p-5 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] shadow-soft transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  03
                </span>
              </div>
              <h4 className="font-bold text-sm text-[#151923] dark:text-white group-hover:text-[#B9825A] transition">
                03. Successor AI Copilot
              </h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1 leading-relaxed">
                Onboarding assistant strictly restricted to verified claims and approved handover packages with zero hallucination.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-[#E5E1D8] dark:border-gray-800 flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 font-semibold">
              <span>Query Copilot</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Feature 04: Permission Shield */}
          <Link
            to={`/projects/${project.id}/members`}
            className="p-5 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] shadow-soft transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  04
                </span>
              </div>
              <h4 className="font-bold text-sm text-[#151923] dark:text-white group-hover:text-[#B9825A] transition">
                04. Permission Shield
              </h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1 leading-relaxed">
                Project Creator governance and data isolation preventing unapproved drafts from premature successor exposure.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-[#E5E1D8] dark:border-gray-800 flex items-center justify-between text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
              <span>Ownership Governance</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Feature 05: Handover Completion Tracker */}
          <Link
            to={`/projects/${project.id}/handover`}
            className="p-5 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] shadow-soft transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  05
                </span>
              </div>
              <h4 className="font-bold text-sm text-[#151923] dark:text-white group-hover:text-[#B9825A] transition">
                05. Handover Completion Tracker
              </h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1 leading-relaxed">
                Formal multi-stage workflow: Preparation → Submission → Creator Verification → Publishing → Successor Receipt.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-[#E5E1D8] dark:border-gray-800 flex items-center justify-between text-xs text-teal-600 dark:text-teal-400 font-semibold">
              <span>{handover?.completion_percentage ?? 0}% · {handover?.status.replace('_', ' ') ?? 'Draft'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Feature 06: What-If Impact Simulator */}
          <Link
            to={`/projects/${project.id}/simulator`}
            className="p-5 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] shadow-soft transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  06
                </span>
              </div>
              <h4 className="font-bold text-sm text-[#151923] dark:text-white group-hover:text-[#B9825A] transition">
                06. What-If Impact Simulator
              </h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1 leading-relaxed">
                Real scenario analysis evaluating continuity blast radius if key personnel or components become unavailable.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-[#E5E1D8] dark:border-gray-800 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              <span>Run Impact Model</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Feature 07: Knowledge Gap Detector */}
          <Link
            to={`/projects/${project.id}/gaps`}
            className="p-5 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] shadow-soft transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  07
                </span>
              </div>
              <h4 className="font-bold text-sm text-[#151923] dark:text-white group-hover:text-[#B9825A] transition">
                07. Knowledge Gap Detector
              </h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1 leading-relaxed">
                Surfaces undocumented components, unassigned responsibilities, and missing operational specs.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-[#E5E1D8] dark:border-gray-800 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold">
              <span>{project.open_gaps_count} Open Gap(s)</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </div>

      {/* ======================================================== */}
      {/* FEATURE 08: DEPARTURE RISK SCORE (Overall Summary)       */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B9825A]">
              Feature 08 — Overall Continuity Exposure Summary
            </span>
            <h3 className="text-lg font-extrabold text-[#151923] dark:text-white">
              08. Departure Risk Score
            </h3>
          </div>
          <span className="text-xs text-[#64748B] dark:text-gray-400">
            Explainable institutional memory index
          </span>
        </div>

        <RiskGauge scoreData={scoreData} />
      </div>

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#151923] dark:text-white mb-1">Edit Project Settings</h3>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mb-4">Update project name, description, or status.</p>

            <form onSubmit={handleUpdateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="in_review">In Review</option>
                  <option value="handover_approved">Handover Approved</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748B] dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] hover:bg-black transition cursor-pointer"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
