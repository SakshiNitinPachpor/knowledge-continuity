import React from 'react';
import { DepartureExposureScore } from '../types';
import { ShieldAlert, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface RiskGaugeProps {
  scoreData: DepartureExposureScore | null;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ scoreData }) => {
  if (!scoreData) {
    return (
      <div className="bg-white dark:bg-[#1B2432] p-6 rounded-3xl border border-[#E5E1D8] dark:border-gray-800 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  const { overall_score, category, explanation, factors } = scoreData;

  const getColor = (score: number) => {
    if (score >= 65) return { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500', lightBg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-900' };
    if (score >= 35) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', lightBg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-900' };
    return { text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500', lightBg: 'bg-teal-50 dark:bg-teal-950/40', border: 'border-teal-200 dark:border-teal-900' };
  };

  const style = getColor(overall_score);

  return (
    <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-6 md:p-8 shadow-soft">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[#E5E1D8] dark:border-gray-800 mb-6">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] dark:text-gray-400 block mb-1">
            Explainable Risk Metric — Feature 08
          </span>
          <h2 className="text-xl font-bold text-[#151923] dark:text-white flex items-center gap-2">
            <ShieldAlert className={`w-5 h-5 ${style.text}`} />
            08. Departure Risk Score — Continuity Exposure Summary
          </h2>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1 max-w-2xl">
            {explanation}
          </p>
        </div>

        {/* Score Badge */}
        <div className={`px-5 py-3 rounded-2xl ${style.lightBg} border ${style.border} text-right shrink-0`}>
          <div className="text-3xl font-extrabold font-mono tracking-tight text-[#151923] dark:text-white">
            {overall_score}<span className="text-sm font-normal text-gray-500"> / 100</span>
          </div>
          <span className={`text-xs font-bold ${style.text}`}>
            {category}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-[11px] text-[#64748B] dark:text-gray-400 font-medium mb-1.5">
          <span>Low Continuity Risk (0-34)</span>
          <span>Moderate Exposure (35-64)</span>
          <span>High Exposure (65-100)</span>
        </div>
        <div className="h-3 w-full bg-[#F2EFE9] dark:bg-gray-800 rounded-full overflow-hidden flex">
          <div
            className={`h-full ${style.bg} transition-all duration-700 ease-out`}
            style={{ width: `${overall_score}%` }}
          />
        </div>
      </div>

      {/* Honest Boundary Notice */}
      <div className="mb-6 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <p className="leading-relaxed">
          <strong>Methodology Note:</strong> This score measures <em>project institutional memory exposure</em> — quantifying the degree of key-person concentration, documentation gaps, and unverified work. It does not predict employee departure.
        </p>
      </div>

      {/* Factors Breakdown */}
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400 mb-3">
        Contributing Risk Factors ({factors.length} identified)
      </h3>

      <div className="space-y-3">
        {factors.map((f, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-[#151923] dark:text-white flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${f.severity === 'critical' ? 'bg-rose-500' : f.severity === 'high' ? 'bg-amber-500' : 'bg-teal-500'}`} />
                {f.factor_name}
              </span>
              <span className="text-xs font-mono font-bold text-[#B9825A]">
                +{f.score_contribution} pts
              </span>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">
              <strong>Evidence:</strong> {f.evidence}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              <strong>Impact:</strong> {f.impact}
            </p>
            <div className="text-[11px] text-[#0F766E] dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 p-2 rounded-lg border border-teal-200 dark:border-teal-900/50">
              <strong>Recommended Mitigation:</strong> {f.mitigation}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
