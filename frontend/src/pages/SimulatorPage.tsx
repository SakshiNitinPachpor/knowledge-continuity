import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { ScenarioResult, SavedScenario } from '../types';
import {
  Compass, Play, AlertTriangle, ShieldCheck,
  CheckCircle2, ArrowRight, UserX, Clock, Cpu, Info,
  BookmarkPlus, SplitSquareVertical, RefreshCw, AlertCircle,
  FileText, Check, HelpCircle
} from 'lucide-react';

export const SimulatorPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [scenarioType, setScenarioType] = useState('person_unavailable');
  const [targetEntity, setTargetEntity] = useState('');
  const [delayWeeks, setDelayWeeks] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);

  // Dynamic project targets
  const [targets, setTargets] = useState<{ people: string[]; components: string[] }>({ people: [], components: [] });
  
  // Saved scenarios state
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState('');
  const [savingScenario, setSavingScenario] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Compare mode
  const [compareScenarioId, setCompareScenarioId] = useState<string>('');
  const [compareResult, setCompareResult] = useState<ScenarioResult | null>(null);

  const loadInitialData = async () => {
    if (!projectId) return;
    try {
      const [tData, sList] = await Promise.all([
        api.getSimulationTargets(projectId).catch(() => ({ people: [], components: [] })),
        api.listSavedScenarios(projectId).catch(() => [])
      ]);
      setTargets(tData);
      setSavedScenarios(sList);
      if (tData.people.length > 0 && !targetEntity) {
        setTargetEntity(tData.people[0]);
      } else if (tData.components.length > 0 && !targetEntity) {
        setTargetEntity(tData.components[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [projectId]);

  const handleRunSimulation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!projectId || !targetEntity.trim()) return;
    setLoading(true);
    setSaveSuccess(false);
    try {
      const res = await api.runSimulation(projectId, scenarioType, targetEntity.trim(), delayWeeks);
      setResult(res);
      setScenarioName(`${targetEntity} - ${scenarioType.replace('_', ' ')}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !result || !scenarioName.trim()) return;
    setSavingScenario(true);
    try {
      const saved = await api.saveSimulationScenario(
        projectId,
        scenarioName.trim(),
        scenarioType,
        targetEntity,
        result
      );
      setSavedScenarios(prev => [saved, ...prev]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingScenario(false);
    }
  };

  const handleSelectCompare = (scenarioId: string) => {
    setCompareScenarioId(scenarioId);
    const found = savedScenarios.find(s => s.id === scenarioId);
    if (found) {
      setCompareResult(found.results);
    } else {
      setCompareResult(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div>
        <span className="text-xs uppercase font-bold tracking-wider text-[#B9825A] block mb-1">
          Feature 08 — What-If Impact Simulator
        </span>
        <h1 className="text-2xl font-extrabold text-[#151923] dark:text-white flex items-center gap-2">
          <Compass className="w-6 h-6 text-indigo-600" />
          Real Continuity Impact & Scenario Analysis
        </h1>
        <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
          Model how much institutional knowledge and operational execution would be affected if a key contributor or core component becomes unavailable.
        </p>
      </div>

      {/* Honest Methodology Notice */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 flex items-start gap-3 text-xs text-indigo-900 dark:text-indigo-300">
        <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed space-y-1">
          <p>
            <strong>Evidence-Grounded Scenario Modeling:</strong> This simulator analyzes verified project responsibilities, uploaded runbooks, architecture claims, and dependencies.
          </p>
          <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
            It is <strong>not</strong> an employee resignation prediction tool. All findings distinguish verified database facts from AI inferences.
          </p>
        </div>
      </div>

      {/* Dynamic Target Quick-Selectors */}
      {(targets.people.length > 0 || targets.components.length > 0) && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Detected Project Entities (from Responsibility Matrix & Documents):
          </span>
          <div className="flex flex-wrap gap-2">
            {targets.people.map((p, i) => (
              <button
                key={`p-${i}`}
                type="button"
                onClick={() => {
                  setTargetEntity(p);
                  setScenarioType('person_unavailable');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                  targetEntity === p && scenarioType === 'person_unavailable'
                    ? 'bg-[#151923] text-white dark:bg-[#B9825A] dark:text-[#111827] border-transparent shadow-xs'
                    : 'bg-white dark:bg-[#1B2432] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-[#B9825A]'
                }`}
              >
                <UserX className="w-3.5 h-3.5 text-purple-500" />
                <span>Person: {p}</span>
              </button>
            ))}

            {targets.components.map((c, i) => (
              <button
                key={`c-${i}`}
                type="button"
                onClick={() => {
                  setTargetEntity(c);
                  setScenarioType('component_unavailable');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                  targetEntity === c && scenarioType === 'component_unavailable'
                    ? 'bg-[#151923] text-white dark:bg-[#B9825A] dark:text-[#111827] border-transparent shadow-xs'
                    : 'bg-white dark:bg-[#1B2432] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-[#B9825A]'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-blue-500" />
                <span>Module: {c}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Simulation Input Form */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft">
        <form onSubmit={handleRunSimulation} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Hypothetical Scenario
            </label>
            <select
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-[#151923] dark:text-white"
            >
              <option value="person_unavailable">Team Member Becomes Unavailable</option>
              <option value="component_unavailable">Component / Module Ownership Vacant</option>
              <option value="task_delayed">Critical Deliverable Milestone Slippage</option>
              <option value="dependency_failed">External Service / API Dependency Failure</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Target Contributor or Critical Project Component
            </label>
            <input
              type="text"
              required
              value={targetEntity}
              onChange={(e) => setTargetEntity(e.target.value)}
              placeholder="e.g. Backend API Lead or Core Payment Gateway"
              className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-[#151923] dark:text-white"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !targetEntity.trim()}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition shadow-soft flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{loading ? 'Analyzing Data...' : 'Run Impact Analysis'}</span>
            </button>
          </div>

        </form>
      </div>

      {/* Uncertainty Notice for Insufficient Data */}
      {result && result.insufficient_data && (
        <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 shadow-soft flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm">Insufficient Database Grounding Data</h4>
            <p className="leading-relaxed">{result.missing_data_explanation}</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              {result.uncertainty_notice}
            </p>
          </div>
        </div>
      )}

      {/* Simulation Results Display */}
      {result && (
        <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft space-y-6">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E1D8] dark:border-gray-800">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400 block mb-0.5">
                Grounded Continuity Simulation Model
              </span>
              <h3 className="text-base font-bold text-[#151923] dark:text-white">
                {result.assumptions}
              </h3>
              <p className="text-[11px] text-[#64748B] dark:text-gray-400 mt-0.5">
                Simulated on: {result.created_at || 'Just now'} · Project Handover Status: <strong>{result.handover_status}</strong>
              </p>
            </div>
            
            <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
              result.confidence_level.includes('High')
                ? 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900'
                : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
            }`}>
              Confidence: {result.confidence_level}
            </span>
          </div>

          {/* Structured Impact Findings Table */}
          {result.findings_table && result.findings_table.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400 mb-3 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#B9825A]" />
                Institutional Impact Findings
              </h4>

              <div className="overflow-x-auto rounded-2xl border border-[#E5E1D8] dark:border-gray-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F6F1] dark:bg-gray-900 border-b border-[#E5E1D8] dark:border-gray-800 text-[10px] uppercase font-bold text-[#64748B] dark:text-gray-400">
                    <tr>
                      <th className="p-3.5">Area / Domain</th>
                      <th className="p-3.5">Impact Finding</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Supporting Evidence Grounding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E1D8] dark:divide-gray-800">
                    {result.findings_table.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                        <td className="p-3.5 font-bold text-[#151923] dark:text-white whitespace-nowrap">
                          {row.area}
                        </td>
                        <td className="p-3.5 text-gray-700 dark:text-gray-300 leading-relaxed">
                          {row.finding}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          {row.is_verified_fact ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                              ✓ Verified Fact
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                              AI Inference
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-[11px] text-gray-500 dark:text-gray-400 italic">
                          {row.evidence_ref || 'Inferred via architectural topology'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Potential Transition Consequences */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400 mb-2">
              Potential Transition Consequences
            </h4>
            <div className="space-y-1.5">
              {result.consequences.map((c, idx) => (
                <div key={idx} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Mitigations */}
          <div className="pt-4 border-t border-[#E5E1D8] dark:border-gray-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Recommended Knowledge-Transfer Actions
            </h4>
            <div className="space-y-2">
              {result.suggested_mitigations.map((m, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 text-xs text-teal-900 dark:text-teal-200">
                  {m}
                </div>
              ))}
            </div>
          </div>

          {/* Save Scenario Bar */}
          <div className="pt-4 border-t border-[#E5E1D8] dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <form onSubmit={handleSaveScenario} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                required
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="Scenario Name (e.g. Baseline Q2 Lead Transition)"
                className="text-xs p-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white"
              />
              <button
                type="submit"
                disabled={savingScenario}
                className="px-4 py-2 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>{savingScenario ? 'Saving...' : 'Save Scenario'}</span>
              </button>
            </form>

            {saveSuccess && (
              <span className="text-xs text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> Scenario saved to audit history!
              </span>
            )}
          </div>

        </div>
      )}

      {/* Scenario Comparison & History Section */}
      {savedScenarios.length > 0 && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#151923] dark:text-white flex items-center gap-2">
                <SplitSquareVertical className="w-4 h-4 text-indigo-600" />
                Saved Scenario Comparison & Audit History
              </h3>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                Select a previously saved scenario to compare continuity exposure side-by-side.
              </p>
            </div>
            
            <select
              value={compareScenarioId}
              onChange={(e) => handleSelectCompare(e.target.value)}
              className="text-xs p-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-[#151923] dark:text-white"
            >
              <option value="">Compare with saved scenario...</option>
              {savedScenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.scenario_name} ({s.created_at.substring(0, 10)})
                </option>
              ))}
            </select>
          </div>

          {/* Comparison Side-by-Side View */}
          {compareResult && result && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#E5E1D8] dark:border-gray-800">
              
              <div className="p-4 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900/60 border border-[#E5E1D8] dark:border-gray-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">Current Simulation</span>
                <h4 className="font-bold text-xs text-[#151923] dark:text-white">{result.assumptions}</h4>
                <p className="text-[11px] text-gray-500">Confidence: {result.confidence_level}</p>
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  <strong>Consequences:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    {result.consequences.slice(0, 2).map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 space-y-2">
                <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Compared Saved Scenario</span>
                <h4 className="font-bold text-xs text-[#151923] dark:text-white">{compareResult.assumptions}</h4>
                <p className="text-[11px] text-gray-500">Confidence: {compareResult.confidence_level}</p>
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  <strong>Consequences:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    {compareResult.consequences.slice(0, 2).map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
};
