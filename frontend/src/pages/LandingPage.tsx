import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, ArrowRight, Brain, AlertTriangle,
  GitMerge, CheckCircle, FileText, Compass, Lock,
  FileCheck2, Search, Zap, Layers, Users
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8F6F1] dark:bg-[#111827] text-[#151923] dark:text-white transition-colors">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        
        {/* Brand Pill */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-xs mb-8">
          <span className="w-2 h-2 rounded-full bg-[#B9825A] animate-pulse" />
          <span className="text-xs font-bold tracking-wide uppercase text-[#B9825A]">
            Enterprise Knowledge Continuity
          </span>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <span className="text-xs text-[#64748B] dark:text-gray-400 font-medium">
            AI-Assisted Handover Platform
          </span>
        </div>

        {/* Main Title & Vision */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#151923] dark:text-white max-w-4xl mx-auto leading-[1.1]">
          When key contributors leave,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B9825A] via-[#9E6A44] to-[#151923] dark:to-white">
            critical knowledge stays.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg md:text-xl text-[#64748B] dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Knowledge Continuity transforms scattered project documents and activity exports into a structured, evidence-backed, human-reviewed handover for incoming successors.
        </p>

        {/* Primary Call to Action */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] font-bold text-sm hover:bg-black dark:hover:bg-[#a5734e] transition shadow-soft flex items-center justify-center space-x-2 group"
            >
              <span>Go to My Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] font-bold text-sm hover:bg-black dark:hover:bg-[#a5734e] transition shadow-soft flex items-center justify-center space-x-2 group"
              >
                <span>Create Your Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white dark:bg-[#1B2432] text-[#151923] dark:text-white border border-[#E5E1D8] dark:border-gray-800 font-bold text-sm hover:bg-[#F2EFE9] dark:hover:bg-gray-800 transition shadow-xs flex items-center justify-center space-x-2"
              >
                <span>Sign In to Existing Account</span>
              </Link>
            </>
          )}
        </div>

        {/* Foundational Philosophy Card */}
        <div className="mt-14 max-w-xl mx-auto p-4 rounded-2xl bg-white/90 dark:bg-[#1B2432]/90 backdrop-blur-xs border border-[#E5E1D8] dark:border-gray-800 text-xs text-[#64748B] dark:text-gray-400">
          <span className="font-bold text-[#151923] dark:text-white uppercase tracking-wider block mb-1">
            Foundational Principle
          </span>
          AI assists with reconstruction. Evidence supports claims. Humans make the final decisions. Never present AI assumptions as verified facts.
        </div>

      </section>

      {/* Ten Product Features Grid */}
      <section className="py-20 bg-white dark:bg-[#1B2432]/60 border-t border-[#E5E1D8] dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-bold tracking-widest text-[#B9825A] mb-2">
              End-to-End Enterprise Continuity
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-[#151923] dark:text-white tracking-tight">
              Eight Specialized Engines Grounded in Evidence
            </h3>
            <p className="mt-4 text-sm text-[#64748B] dark:text-gray-400">
              Every deliverable, decision, and dependency is connected to verifiable project evidence with full reviewer governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-[#F8F6F1] dark:bg-gray-900 border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] transition">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 flex items-center justify-center mb-4">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-[#151923] dark:text-white mb-1.5">1. AI Risk Radar</h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 leading-relaxed">
                Detects single points of failure, missing runbooks, unassigned deliverables, and contradictory specs before departures occur.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-[#F8F6F1] dark:bg-gray-900 border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-[#151923] dark:text-white mb-1.5">2. Evidence & Trust Engine</h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 leading-relaxed">
                Every extracted claim links to exact character offsets, document pages, and passages with side-by-side contradiction resolution.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-[#F8F6F1] dark:bg-gray-900 border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] transition">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 flex items-center justify-center mb-4">
                <Brain className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-[#151923] dark:text-white mb-1.5">3. Successor AI Copilot</h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 leading-relaxed">
                Onboarding assistant strictly restricted to verified claims and approved handover packages with zero hallucinated history.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-[#F8F6F1] dark:bg-gray-900 border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] transition">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-[#151923] dark:text-white mb-1.5">4. Permission Shield</h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 leading-relaxed">
                Project Creator governance and tenant data isolation preventing unapproved drafts from premature successor exposure.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-3xl bg-[#F8F6F1] dark:bg-gray-900 border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] transition">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 flex items-center justify-center mb-4">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-[#151923] dark:text-white mb-1.5">5. Handover Completion Tracker</h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 leading-relaxed">
                Multi-stage verification workflow: Preparation → Submission → Creator Verification → Publishing → Successor Receipt.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-3xl bg-[#F8F6F1] dark:bg-gray-900 border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] transition">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 flex items-center justify-center mb-4">
                <Compass className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-[#151923] dark:text-white mb-1.5">6. What-If Impact Simulator</h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 leading-relaxed">
                Simulate continuity impact when key contributors leave, deadlines slip, or dependencies fail to compute exposure blast radius.
              </p>
            </div>

            {/* Feature 7 */}
            <div className="p-6 rounded-3xl bg-[#F8F6F1] dark:bg-gray-900 border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] transition">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 flex items-center justify-center mb-4">
                <Search className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-[#151923] dark:text-white mb-1.5">7. Knowledge Gap Detector</h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 leading-relaxed">
                Surfaces ungrounded decisions, unassigned tasks, and undocumented services, generating questions for departing contributors.
              </p>
            </div>

            {/* Feature 8 */}
            <div className="p-6 rounded-3xl bg-[#F8F6F1] dark:bg-gray-900 border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] transition">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 flex items-center justify-center mb-4">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-[#151923] dark:text-white mb-1.5">8. Departure Risk Score</h4>
              <p className="text-xs text-[#64748B] dark:text-gray-400 leading-relaxed">
                Explainable continuity exposure index quantifying key-person concentration, documentation coverage, and unverified deliverables.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#E5E1D8] dark:border-gray-800 text-center text-xs text-[#64748B] dark:text-gray-500">
        <p className="font-semibold text-[#151923] dark:text-gray-300">
          Knowledge Continuity — Preserve Knowledge. Continue Progress.
        </p>
        <p className="mt-1">
          Built with FastAPI, SQLAlchemy, React, TypeScript, Tailwind CSS, and strict evidence verification.
        </p>
      </footer>

    </div>
  );
};
