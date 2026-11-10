import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import {
  LayoutDashboard, FileText, CheckCircle2, ShieldAlert,
  HelpCircle, Compass, Bot,
  Award, Users, FileSpreadsheet, ArrowLeft, UserCheck
} from 'lucide-react';
import { Project } from '../types';

interface SidebarProps {
  project?: Project | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ project }) => {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId || project?.id;

  if (!id) return null;

  const links = [
    { to: `/projects/${id}`, label: 'Overview', icon: LayoutDashboard },
    { to: `/projects/${id}/documents`, label: 'Documents & Upload', icon: FileText, badge: project?.document_count },
    { to: `/projects/${id}/responsibilities`, label: 'Responsibility Matrix', icon: UserCheck },
    { to: `/projects/${id}/review`, label: 'Evidence Review Centre', icon: CheckCircle2, badge: (project?.claims_count || 0) - (project?.verified_claims_count || 0), highlightBadge: true },
    { to: `/projects/${id}/risks`, label: 'AI Risk Radar', icon: ShieldAlert, badge: project?.open_risks_count },
    { to: `/projects/${id}/gaps`, label: 'Knowledge Gap Detector', icon: HelpCircle, badge: project?.open_gaps_count },
    { to: `/projects/${id}/simulator`, label: 'What-If Impact Simulator', icon: Compass },
    { to: `/projects/${id}/copilot`, label: 'Successor AI Copilot', icon: Bot, isSpecial: true },
    { to: `/projects/${id}/handover`, label: 'Handover & Publishing', icon: Award },
    { to: `/projects/${id}/members`, label: 'Team Members', icon: Users },
    { to: `/projects/${id}/audit`, label: 'Audit Trail & Lineage', icon: FileSpreadsheet },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-[#1B2432] border-r border-[#E5E1D8] dark:border-gray-800 flex flex-col h-[calc(100vh-4rem)] sticky top-16 transition-colors">
      
      {/* Project Switcher / Return */}
      <div className="p-4 border-b border-[#E5E1D8] dark:border-gray-800">
        <NavLink
          to="/dashboard"
          className="inline-flex items-center space-x-1.5 text-xs text-[#64748B] hover:text-[#151923] dark:text-gray-400 dark:hover:text-white mb-2 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </NavLink>
        <div className="flex items-center justify-between">
          <div className="truncate">
            <h2 className="text-sm font-bold text-[#151923] dark:text-white truncate">
              {project?.name || 'Loading Project...'}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F2EFE9] dark:bg-gray-800 text-[#64748B] dark:text-gray-300">
                {project?.code || 'PROJECT'}
              </span>
              {project?.user_role && (
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                  project.user_role === 'successor' 
                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                    : project.user_role === 'reviewer'
                    ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300'
                    : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                }`}>
                  {project.user_role.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === `/projects/${id}`}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#151923] text-white dark:bg-[#B9825A] dark:text-[#111827] shadow-soft'
                    : 'text-[#64748B] hover:text-[#151923] dark:text-gray-400 dark:hover:text-white hover:bg-[#F2EFE9] dark:hover:bg-gray-800/60'
                }`
              }
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{link.label}</span>
              </div>
              {link.badge !== undefined && link.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                    link.highlightBadge
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {link.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Core Principle Footer */}
      <div className="p-3 border-t border-[#E5E1D8] dark:border-gray-800 bg-[#F8F6F1]/50 dark:bg-[#111827]/40 text-[10px] text-[#64748B] dark:text-gray-500 leading-tight">
        <p className="font-semibold text-[#151923] dark:text-gray-400">Core Principle:</p>
        <p className="mt-0.5">AI assists reconstruction. Evidence supports claims. Humans make decisions.</p>
      </div>

    </aside>
  );
};
