import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Risk, DepartureExposureScore } from '../types';
import { RiskGauge } from '../components/RiskGauge';
import {
  ShieldAlert, AlertTriangle, CheckCircle, Plus,
  Info, Sparkles, Filter, ChevronRight
} from 'lucide-react';

export const RisksPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [scoreData, setScoreData] = useState<DepartureExposureScore | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter
  const [severityFilter, setSeverityFilter] = useState('all');

  const loadData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [rList, sData] = await Promise.all([
        api.listRisks(projectId),
        api.getDepartureScore(projectId),
      ]);
      setRisks(rList);
      setScoreData(sData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleResolveRisk = async (risk: Risk) => {
    if (!projectId) return;
    const nextStatus = risk.status === 'resolved' ? 'identified' : 'resolved';
    await api.updateRisk(projectId, risk.id, { status: nextStatus });
    await loadData();
  };

  const filteredRisks = risks.filter(r => {
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Title */}
      <div>
        <span className="text-xs uppercase font-bold tracking-wider text-[#B9825A] block mb-1">
          Feature 3 & 10 — AI Risk Radar
        </span>
        <h1 className="text-2xl font-extrabold text-[#151923] dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-rose-600" />
          Continuity Risk Radar & Exposure Index
        </h1>
        <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
          Detects single-person bottlenecks, unmitigated dependencies, and unfinished deliverables before handover.
        </p>
      </div>

      {/* Explainable Departure Risk Gauge */}
      <RiskGauge scoreData={scoreData} />

      {/* Individual Risk Radar Cards */}
      <div className="space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[#151923] dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#B9825A]" />
            Continuity Risk Radar Items ({filteredRisks.length})
          </h2>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400 font-semibold mr-1">Severity:</span>
            {['all', 'critical', 'high', 'medium', 'low'].map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded-lg font-bold capitalize transition ${
                  severityFilter === sev
                    ? 'bg-[#151923] text-white dark:bg-[#B9825A] dark:text-[#111827]'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRisks.map(r => (
            <div
              key={r.id}
              className="p-6 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft hover:border-[#B9825A]/50 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                    r.severity === 'critical'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                      : r.severity === 'high'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-teal-100 text-teal-800'
                  }`}>
                    {r.severity} Severity
                  </span>

                  <button
                    onClick={() => handleResolveRisk(r)}
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full transition ${
                      r.status === 'resolved'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {r.status === 'resolved' ? '✓ Resolved' : 'Mark Resolved'}
                  </button>
                </div>

                <h3 className="font-bold text-sm text-[#151923] dark:text-white mb-2">
                  {r.title}
                </h3>
                <p className="text-xs text-[#64748B] dark:text-gray-300 leading-relaxed mb-4">
                  {r.description}
                </p>

                {r.impact && (
                  <div className="mb-3 text-xs text-rose-900 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50">
                    <strong className="block text-[10px] uppercase mb-0.5 font-bold">Operational Impact:</strong>
                    {r.impact}
                  </div>
                )}
              </div>

              {r.suggested_mitigation && (
                <div className="pt-3 border-t border-[#E5E1D8] dark:border-gray-800 text-[11px] text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 p-3 rounded-xl border border-teal-200 dark:border-teal-900/50">
                  <strong className="block text-[10px] uppercase mb-0.5 font-bold">Actionable Mitigation:</strong>
                  {r.suggested_mitigation}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

    </div>
  );
};
