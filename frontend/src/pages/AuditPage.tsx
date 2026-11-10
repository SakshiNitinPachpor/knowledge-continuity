import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { AuditEvent } from '../types';
import { FileSpreadsheet, Clock, User, ShieldCheck } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api.listAudit(projectId)
      .then(res => setEvents(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Title */}
      <div>
        <span className="text-xs uppercase font-bold tracking-wider text-[#B9825A] block mb-1">
          Compliance & Lineage Verification
        </span>
        <h1 className="text-2xl font-extrabold text-[#151923] dark:text-white flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-[#B9825A]" />
          Immutable Audit Trail & Knowledge Lineage
        </h1>
        <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
          Complete chronological record of all human approvals, conflict resolutions, status changes, and publications.
        </p>
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 shadow-soft overflow-hidden">
        <div className="p-5 border-b border-[#E5E1D8] dark:border-gray-800">
          <h2 className="text-sm font-bold text-[#151923] dark:text-white">Recent Audit Events ({events.length})</h2>
        </div>

        {events.length > 0 ? (
          <div className="divide-y divide-[#E5E1D8] dark:divide-gray-800">
            {events.map((e) => (
              <div key={e.id} className="p-5 hover:bg-[#F8F6F1] dark:hover:bg-gray-900/40 transition">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {e.action}
                    </span>
                    <span className="text-xs font-bold text-[#151923] dark:text-white">
                      {e.entity_type} ({e.entity_id?.substring(0, 8)})
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-[#64748B] dark:text-gray-400 font-mono">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-[#B9825A]" />
                      {e.user_email}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {e.created_at?.replace('T', ' ').substring(0, 19)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#64748B] dark:text-gray-300 leading-relaxed">
                  {e.details}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-gray-400">
            No audit records logged yet.
          </div>
        )}
      </div>

    </div>
  );
};
